"""Tools the shop assistant can call.

Every one reads the supplied database through `db.py` and returns a structured
type from `models.py` rather than free text. Three things follow from that:

* **The agent cannot misread a field.** A size is a `SizeStock` with a boolean
  and a label, not a sentence the model has to parse back out.
* **The shop decides the wording, not the model.** `SizeStock.status` produces
  the same three phrases the product page shows — "Sold out", "Only 2 left",
  "12 in stock" — so the chat and the catalogue never contradict each other.
* **A miss is data, not an exception.** An unknown product returns a
  `ToolError` carrying guidance, so the agent is told what to do instead of
  being left to invent an answer.

Tools also record every garment they touch on `ChatDeps.seen`, which is what
the endpoint turns into picture cards and stores in `products_json`. They never
hand the model an image URL — the interface renders pictures itself.

The tools are plain functions, registered in `agent.py`, so this module imports
nothing from the agent and can be exercised on its own.
"""

from __future__ import annotations

import functools
import time
from typing import Any, Callable

from pydantic_ai import RunContext

import audit
import db
from models import (
    AppliedFilter,
    ChatDeps,
    ProductInfo,
    RecalledTurn,
    RecalledHistory,
    SearchResult,
    SizeStock,
    StockReport,
    ToolError,
)

#: How many garments one search may put in front of a shopper.
SEARCH_LIMIT = 6


def audited(fn: Callable) -> Callable:
    """Record every tool call on the audit trail.

    Wraps rather than replaces: `functools.wraps` keeps the name, docstring and
    signature, which is what Pydantic AI reads to build the tool schema the
    model sees. Auditing a tool therefore cannot change how the model calls it.

    A failure in the trail must never fail a shopper's turn, so the result is
    returned whether or not the write succeeded.
    """

    @functools.wraps(fn)
    async def wrapper(ctx: RunContext[ChatDeps], *args: Any, **kwargs: Any):
        started = time.perf_counter()
        result = await fn(ctx, *args, **kwargs)
        audit.record(
            "tool_call",
            run_id=getattr(ctx.deps, "run_id", "") or "unknown",
            tool=fn.__name__,
            args=kwargs or {"positional": list(args)},
            result=result.model_dump() if hasattr(result, "model_dump") else result,
            duration_ms=int((time.perf_counter() - started) * 1000),
            user_id=getattr(ctx.deps, "user_id", None),
        )
        return result

    return wrapper

#: Said whenever a size is sold out. Every garment is carried in all six sizes,
#: so a zero means sold out rather than never stocked — and there are no
#: restock dates anywhere in the data, so none may be stated.
RESTOCK_NOTE = (
    "Sizes showing zero are sold out, not sizes the shop never carried — every "
    "garment is stocked in all six sizes XS–XXL, so they are expected back. "
    "There is no restock date in the catalog, so do not give one."
)


def _not_found(product_id: str) -> ToolError:
    return ToolError(
        error=f"No product with id {product_id!r} is in the catalog.",
        guidance=(
            "Do not invent this product. Call search_catalog to find what the "
            "shop actually has, and tell the shopper plainly if nothing matches."
        ),
    )


@audited
async def search_catalog(
    ctx: RunContext[ChatDeps],
    query: str | None = None,
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
) -> SearchResult | ToolError:
    """Search the Campus Customs catalog for garments.

    Call this before answering any question about what the shop has.

    `query` is matched against how the garment is described rather than its
    merchandising name: its `garment_type`, its `description`, its `search_tags`
    and its colors. That is the vocabulary shoppers use, so plain phrasing works
    — "something for my mom", "field hockey", "quarter zip", "warm fleece". A
    product name typed exactly will also find its garment.

    Optional filters: `category` (T-Shirts, Sweatshirts & Crewnecks, Hoodies,
    Quarter-Zips, Jackets, Performance Shirts), `color`, `max_price` in dollars,
    and `size` — one of XS, S, M, L, XL, XXL.

    **Use `size` whenever the shopper says what size they need.** It returns only
    garments with that size actually in stock, which is not the same as garments
    the shop lists in that size: about a quarter of every size is sold out at any
    time. If they say "what do you have in XL", that is a size filter, not a
    word to put in the query.

    Returns up to six garments, each with description, price and per-size stock.
    """
    if query:
        ctx.deps.queries.append(query)
    hits = db.search_products(
        query=query, category=category, color=color, size=size,
        max_price=max_price, limit=SEARCH_LIMIT,
    )
    ctx.deps.remember(hits)

    # Each search replaces the filter in force on the page, so a shopper who
    # changes tack gets a clean result rather than an accumulating one.
    ctx.deps.last_filter = AppliedFilter(
        query=query,
        category=category,
        color=color,
        size=size.upper() if size else None,
        max_price=max_price,
    )

    if not hits:
        return SearchResult(
            query=query or "", count=0, products=[],
            note=(
                "Nothing in the catalog matches that. Say so plainly, do not "
                "invent a garment, and offer the nearest real alternative."
            ),
        )
    return SearchResult(
        query=query or "",
        count=len(hits),
        products=[ProductInfo.from_product(h) for h in hits],
    )


@audited
async def product_info(ctx: RunContext[ChatDeps], product_id: str) -> ProductInfo | ToolError:
    """Everything the catalog holds about one garment.

    Use when the shopper has named or selected a specific garment. Returns its
    description, garment type, search tags, colors, price, and the stock for
    every size. `product_id` is the slug shown with each search result, for
    example `basic-hoodie-big-yale`.
    """
    product = db.get_product(product_id)
    if not product:
        return _not_found(product_id)
    ctx.deps.remember([product])
    return ProductInfo.from_product(product)


@audited
async def check_stock(ctx: RunContext[ChatDeps], product_id: str) -> StockReport | ToolError:
    """How many units of each size remain for one garment.

    Call this before telling a shopper anything about sizes or availability.
    Counts are live, read from the inventory table at the moment of the call.

    Each size comes back with a quantity, an `in_stock` flag and the shop's own
    wording: "Sold out", "Only 2 left", or "12 in stock". Use that wording.
    """
    product = db.get_product(product_id)
    if not product:
        return _not_found(product_id)
    ctx.deps.remember([product])

    sizes = [SizeStock.from_row(r["size"], r["quantity"]) for r in product["inventory"]]
    sold_out = [s.size for s in sizes if not s.in_stock]
    return StockReport(
        product_id=product["product_id"],
        name=product["name"],
        price=product["price"],
        sizes=sizes,
        available_sizes=[s.size for s in sizes if s.in_stock],
        sold_out_sizes=sold_out,
        total_stock=product["total_stock"],
        restock_note=RESTOCK_NOTE if sold_out else None,
    )


@audited
async def recall_chat_history(
    ctx: RunContext[ChatDeps], limit: int = 10
) -> RecalledHistory | ToolError:
    """What this shopper said to the shop on previous visits.

    Call this when a signed-in shopper refers to something from before — "the
    hoodie you showed me", "did I ask about this already?", "what was that
    crewneck called?" — or when they greet you as someone who has been here
    before and you need to know what they looked at.

    Do not call it on every turn. The current conversation is already in front
    of you; this is for earlier visits only. It returns the most recent turns,
    oldest first, with the garments that were shown at the time.
    """
    if ctx.deps.user_id is None:
        return ToolError(
            error="This shopper is not signed in, so the shop has no saved history for them.",
            guidance=(
                "Do not guess at what they may have asked before. Help them with "
                "what they are asking now, and if remembering would genuinely "
                "help, you may mention that an account saves their conversations."
            ),
        )

    rows = db.get_history(ctx.deps.user_id, limit=max(1, min(limit, 30)))
    if not rows:
        return RecalledHistory(
            count=0, turns=[],
            note="This shopper has an account but has not spoken to the shop before.",
        )

    return RecalledHistory(
        count=len(rows),
        turns=[
            RecalledTurn(
                role=r["role"],
                content=r["content"],
                products=[p.get("name", "") for p in r["products"] if p.get("name")],
                when=r["created_at"],
            )
            for r in rows
        ],
    )


@audited
async def list_categories(ctx: RunContext[ChatDeps]) -> str:
    """The categories the shop sorts its garments into, with how many are in each.

    Use when a shopper asks broadly what the shop sells.
    """
    _ = ctx
    return "\n".join(
        f"  {c['category']}: {c['count']} garments" for c in db.category_counts()
    )


#: Registered on the agent in agent.py, in the order the model sees them.
ALL_TOOLS = [
    search_catalog,
    product_info,
    check_stock,
    recall_chat_history,
    list_categories,
]
