"""SQLite access for the Campus Customs database.

The course supplies `data/campus_customs.db` already populated: 102 catalogue
rows, 612 inventory rows, seeded users, and seeded chat history. Nothing here
rebuilds or alters it — the database is assignment evidence, so normalisation
happens in this layer rather than with ALTER TABLE.
"""

from __future__ import annotations

import json
import sqlite3
from functools import lru_cache
from pathlib import Path
from typing import Any

#: backend/ sits beside data/, so the database is one level up.
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "campus_customs.db"
MEDIA_ROOT = DB_PATH.parent

#: Size order as a size chart reads, not alphabetically.
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

# --------------------------------------------------------------------------- #
# Decision 1 — garment_type normalisation
#
# The catalogue holds 22 free-text garment types that overlap badly: a shopper
# searching "sweatshirt" exact-matches nothing while 38 sweatshirts sit in the
# catalogue, and `short-sleeve t-shirt` / `short-sleeve T-shirt` are one type
# split by a single capital letter. These six categories are what the browse
# filters offer; the raw garment_type is still shown on the product page.
# --------------------------------------------------------------------------- #

CATEGORIES = [
    "T-Shirts",
    "Sweatshirts & Crewnecks",
    "Hoodies",
    "Quarter-Zips",
    "Jackets",
    "Performance Shirts",
]

CATEGORY_MAP: dict[str, str] = {
    # T-Shirts
    "short-sleeve t-shirt": "T-Shirts",
    "short-sleeve T-shirt": "T-Shirts",
    "heavyweight short-sleeve t-shirt": "T-Shirts",
    "short-sleeve crew-neck t-shirt": "T-Shirts",
    "t-shirt": "T-Shirts",
    # Sweatshirts & Crewnecks
    "crewneck sweatshirt": "Sweatshirts & Crewnecks",
    "crewneck": "Sweatshirts & Crewnecks",
    "mockneck sweatshirt": "Sweatshirts & Crewnecks",
    "raglan crewneck sweatshirt": "Sweatshirts & Crewnecks",
    # Hoodies — anything with a hood, zip or not.
    "pullover hoodie": "Hoodies",
    "hoodie": "Hoodies",
    "full-zip hooded sweatshirt": "Hoodies",
    "hooded pullover sweatshirt": "Hoodies",
    "hooded sweatshirt": "Hoodies",
    # Quarter-Zips
    "quarter-zip pullover sweatshirt": "Quarter-Zips",
    "quarter-zip pullover": "Quarter-Zips",
    # Jackets
    "full-zip fleece jacket": "Jackets",
    "bomber jacket": "Jackets",
    "fleece jacket": "Jackets",
    "jacket": "Jackets",
    # Performance Shirts
    "long-sleeve performance shirt": "Performance Shirts",
    "men's long-sleeve performance shirt": "Performance Shirts",
}


def categorise(garment_type: str) -> str:
    """Map a raw garment_type onto a customer-facing category.

    Falls back to a case-insensitive lookup, then to keyword matching, so a
    garment type added to the database later still lands somewhere sensible
    instead of disappearing from the filters.
    """
    if garment_type in CATEGORY_MAP:
        return CATEGORY_MAP[garment_type]
    lowered = {k.lower(): v for k, v in CATEGORY_MAP.items()}
    if garment_type.lower() in lowered:
        return lowered[garment_type.lower()]
    g = garment_type.lower()
    if "hood" in g:
        return "Hoodies"
    if "quarter-zip" in g or "quarter zip" in g:
        return "Quarter-Zips"
    if "jacket" in g:
        return "Jackets"
    if "performance" in g:
        return "Performance Shirts"
    if "sweatshirt" in g or "crew" in g:
        return "Sweatshirts & Crewnecks"
    return "T-Shirts"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _sort_sizes(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        rows,
        key=lambda s: SIZE_ORDER.index(s["size"]) if s["size"] in SIZE_ORDER else 99,
    )


def _product(row: sqlite3.Row, conn: sqlite3.Connection) -> dict[str, Any]:
    """Shape one catalogue row for the API.

    Decision 3 — the key set matches the `products_json` payloads the course's
    own reference implementation stored on assistant turns, including the three
    derived keys that are not columns: `image_url`, `inventory` and
    `total_stock`. `category` is ours, added for the browse filters.
    """
    inv = _sort_sizes(
        [
            {"size": r["size"], "quantity": r["quantity"]}
            for r in conn.execute(
                "SELECT size, quantity FROM inventory WHERE product_id = ?",
                (row["product_id"],),
            )
        ]
    )
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "garment_type": row["garment_type"],
        "category": categorise(row["garment_type"]),
        "description": row["description"],
        "colors": json.loads(row["colors"]),
        "search_tags": json.loads(row["search_tags"]),
        "image_file_path": row["image_file_path"],
        # The reference implementation served photos under /media.
        "image_url": f"/media/{row['image_file_path']}",
        "price": row["price"],
        "inventory": inv,
        "total_stock": sum(s["quantity"] for s in inv),
    }


# Fields a free-text query is matched against, in two tiers.
#
# The natural-language tier comes first on purpose. `garment_type`,
# `description`, `search_tags` and `colors` are written the way shoppers speak:
# what the garment is, what it looks like, and the vocabulary someone might
# arrive with. `name` is a merchandising label — compressed, branded and built
# to tell two SKUs apart on a shelf — so matching it first lets a brand word
# outrank a garment that genuinely fits the request. It is kept as a second
# pass so that a shopper who types a product name exactly still finds it.
_NL_FIELDS = ("garment_type", "description", "search_tags", "colors")
_SEARCH_FIELDS = _NL_FIELDS + ("name",)


#: Words that carry no product meaning. Shoppers and the chat agent both write
#: in sentences — "do you have something for my mom" — and matching on `for` or
#: `my` drags in half the catalogue on a substring match, burying the one word
#: that mattered. These are dropped before the query reaches SQL.
_STOPWORDS = frozenset("""
a an the and or but for my me i you your our their his her its it this that these those
some something anything someone anybody thing things stuff
to of in on at by with from about into over under as
is are am be been was were do does did have has had can could would should will
want wants need needs looking look show find get buy order please thanks thank
any all more most very really just about around like
""".split())


def _tokenize(query: str) -> list[str]:
    """Split a shopper's words into searchable stems.

    Shoppers and the chat agent both type plurals — "hoodies", "sweatshirts",
    "t-shirts" — while the catalogue is written in the singular. Matching the
    raw phrase finds nothing at all, so each word is lowercased, stripped of
    punctuation and de-pluralised before it reaches SQL. `ss` endings are left
    alone so "dress" does not become "dres". Filler words are then dropped, so
    "something for my mom" searches on "mom".
    """
    out = []
    for raw in query.lower().split():
        word = raw.strip(".,!?'\"()")
        if not word:
            continue
        if len(word) > 3 and word.endswith("es") and not word.endswith(("ses", "sses")):
            word = word[:-2]
        elif len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
            word = word[:-1]
        out.append(word)

    # Keep the content words. If a shopper wrote nothing but filler, fall back
    # to what they typed rather than matching the entire catalogue.
    content = [w for w in out if w not in _STOPWORDS and len(w) > 1]
    return content or out


def _text_clause(
    tokens: list[str], join: str, fields: tuple[str, ...]
) -> tuple[str, list[Any]]:
    """Build `(tok matches any field) <join> (tok matches any field) ...`."""
    per_token = "(" + " OR ".join(f"{f} LIKE ?" for f in fields) + ")"
    clause = f" {join} ".join(per_token for _ in tokens)
    params: list[Any] = []
    for tok in tokens:
        params.extend([f"%{tok}%"] * len(fields))
    return f"AND ({clause})", params


def search_products(
    query: str | None = None,
    category: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
    limit: int = 120,
) -> list[dict[str, Any]]:
    """Free-text plus facet search.

    Category filtering happens in Python because the categories are derived, not
    stored. Text matching is deliberately fuzzy (decision 1, option A as the
    fallback) so "field hockey" or "quarter zip" still find things the category
    filter would not.

    Three passes, widening only when the narrower one finds nothing:

    1. every word against the natural-language fields — how shoppers describe
       what they want;
    2. every word against those fields plus `name`, which catches someone
       typing a product name exactly;
    3. any word against everything, so a query carrying one word the shop does
       not stock still returns the nearest real thing instead of an empty page.
    """
    tokens = _tokenize(query) if query else []
    if not tokens:
        return _run_search([], "AND", _SEARCH_FIELDS, category, color, max_price, size, limit)

    for fields in (_NL_FIELDS, _SEARCH_FIELDS):
        rows = _run_search(tokens, "AND", fields, category, color, max_price, size, limit)
        if rows:
            return rows

    # Loosest pass, for conversational phrasing like "something warm for
    # walking to class in February", where only one or two words describe a
    # garment at all.
    #
    # Matching any single word is too generous: "Yale" is in nearly every row,
    # so "Yale quidditch robe" would return six unrelated garments as the
    # nearest match. Requiring a fixed share of the words is too strict, since
    # it throws away the vague queries this pass exists for.
    #
    # So words are weighted by how rare they are. A word matching more than
    # two-fifths of the catalogue describes nothing in particular and is
    # ignored; a garment then qualifies by matching at least one word that
    # actually narrows things down, and ranks by how many it matches.
    candidates = _run_search(tokens, "OR", _SEARCH_FIELDS, category, color, max_price, size, 0)
    if not candidates:
        return []

    total = _catalogue_size()
    distinctive = [t for t in tokens if _document_frequency(t) <= 0.4 * total]
    if not distinctive:
        return []

    scored = []
    for row in candidates:
        haystack = " ".join(
            str(row[f]).lower() for f in ("garment_type", "description", "name")
        ) + " " + " ".join(str(x).lower() for x in row["search_tags"] + row["colors"])
        score = sum(1 for tok in distinctive if tok in haystack)
        if score:
            scored.append((score, row["name"], row))
    scored.sort(key=lambda s: (-s[0], s[1]))
    return [row for _, _, row in scored][:limit]


@lru_cache(maxsize=1)
def _catalogue_size() -> int:
    with connect() as conn:
        return int(conn.execute("SELECT COUNT(*) FROM catalogue").fetchone()[0])


@lru_cache(maxsize=512)
def _document_frequency(token: str) -> int:
    """How many catalogue rows contain this word anywhere searchable.

    Cached because the catalogue is read-only here and the same handful of
    words recur across a conversation.
    """
    where = " OR ".join(f"{f} LIKE ?" for f in _SEARCH_FIELDS)
    params = [f"%{token}%"] * len(_SEARCH_FIELDS)
    with connect() as conn:
        return int(
            conn.execute(f"SELECT COUNT(*) FROM catalogue WHERE {where}", params).fetchone()[0]
        )


def _run_search(
    tokens: list[str],
    join: str,
    fields: tuple[str, ...],
    category: str | None,
    color: str | None,
    max_price: float | None,
    size: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    sql = ["SELECT * FROM catalogue WHERE 1=1"]
    params: list[Any] = []

    if tokens:
        clause, text_params = _text_clause(tokens, join, fields)
        sql.append(clause)
        params.extend(text_params)
    if color:
        sql.append("AND colors LIKE ?")
        params.append(f"%{color}%")
    if max_price is not None:
        sql.append("AND price <= ?")
        params.append(max_price)
    if size:
        # "Available in my size" means a stock row above zero for that size —
        # not merely that the shop lists the size.
        sql.append(
            "AND EXISTS (SELECT 1 FROM inventory i WHERE i.product_id ="
            " catalogue.product_id AND i.size = ? AND i.quantity > 0)"
        )
        params.append(size.upper())
    sql.append("ORDER BY name")

    with connect() as conn:
        rows = conn.execute(" ".join(sql), params).fetchall()
        items = [_product(r, conn) for r in rows]

    if category:
        items = [p for p in items if p["category"] == category]
    # limit 0 means "give me everything, the caller will rank and trim".
    return items if limit == 0 else items[:limit]


def get_product(product_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM catalogue WHERE product_id = ?", (product_id,)
        ).fetchone()
        return _product(row, conn) if row else None


def category_counts() -> list[dict[str, Any]]:
    """Each category with how many products it holds, for the browse filters."""
    counts = {c: 0 for c in CATEGORIES}
    with connect() as conn:
        for r in conn.execute("SELECT garment_type, COUNT(*) c FROM catalogue GROUP BY garment_type"):
            counts[categorise(r["garment_type"])] += r["c"]
    return [{"category": c, "count": counts[c]} for c in CATEGORIES]


# --------------------------------------------------------------------------- #
# Accounts
#
# `users` is the one table besides `chat_messages` this app writes to. Password
# hashing lives in auth.py; nothing here ever sees a plaintext password, and
# `password_hash` never leaves this module.
# --------------------------------------------------------------------------- #


def public_user(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    """Strip a user row down to what is safe to send to the browser."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
    }


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Look up by email, case-insensitively — people capitalise inconsistently."""
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def create_user(
    first_name: str, last_name: str, email: str, password_hash: str
) -> dict[str, Any] | None:
    """Insert a new account. Returns None if the email is already taken.

    `name` is not null in the supplied schema and predates the split first/last
    columns, so it is filled from the two parts rather than left out.
    """
    first, last = first_name.strip(), last_name.strip()
    full = f"{first} {last}".strip()
    try:
        with connect() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name)"
                " VALUES (?, ?, ?, ?, ?)",
                (full, email.strip(), password_hash, first, last),
            )
            conn.commit()
            user_id = int(cur.lastrowid)
    except sqlite3.IntegrityError:
        # The unique index on email is the race-safe check; a prior SELECT is not.
        return None
    return get_user_by_id(user_id)


# --------------------------------------------------------------------------- #
# Chat history
#
# `chat_messages` is the other table this app writes to. Assistant rows carry
# the garments the agent looked up in `products_json`, which is what lets an old
# conversation be re-opened with its picture cards intact.
# --------------------------------------------------------------------------- #


def get_history(user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    """A shopper's past turns, oldest first, most recent `limit` kept."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, role, content, products_json, created_at"
            " FROM chat_messages WHERE user_id = ?"
            " ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "role": r["role"],
            "content": r["content"],
            "products": json.loads(r["products_json"]) if r["products_json"] else [],
            "created_at": r["created_at"],
        }
        for r in reversed(rows)  # newest-first above, oldest-first for display
    ]


def save_message(
    user_id: int,
    role: str,
    content: str,
    products: list[dict[str, Any]] | None = None,
) -> int:
    """Append one turn. `products` is stored only on assistant rows."""
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json)"
            " VALUES (?, ?, ?, ?)",
            (user_id, role, content, json.dumps(products) if products else None),
        )
        conn.commit()
        return int(cur.lastrowid)


def history_stats(user_id: int) -> dict[str, Any]:
    """How much this shopper has said before, and when they last did.

    Cheap enough to run on every turn, which is the point: the agent needs to
    know that memory *exists* before it can decide whether to go and read it.
    """
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n, MAX(created_at) AS last"
            " FROM chat_messages WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return {"count": int(row["n"] or 0), "last_seen": row["last"]}
