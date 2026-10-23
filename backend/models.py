"""Structured types for the Campus Customs API and agent.

Everything the API accepts or returns is declared here, so `main.py` stays
routing and `agent.py` stays wiring. The import graph runs one way —
`models` → `tools` → `agent` → `main` — which keeps the agent's dependency
type importable by the tools without a cycle.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, EmailStr, Field

# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #


class StockRow(BaseModel):
    """One size of one garment."""

    size: str
    quantity: int


class ProductCard(BaseModel):
    """A garment as the API returns it, and as the chat widget renders it.

    The key set matches the `products_json` payloads the supplied database
    stores on assistant turns, including the three derived fields that are not
    catalogue columns — `image_url`, `inventory` and `total_stock` — so the
    browse pages and the agent speak one shape. `category` is ours, added for
    the normalised browse filters.
    """

    product_id: str
    name: str
    garment_type: str
    category: str
    description: str
    colors: list[str]
    search_tags: list[str]
    image_file_path: str
    image_url: str
    price: float
    inventory: list[StockRow]
    total_stock: int

    # Set only on cards rebuilt from stored chat history (decision 4). The
    # snapshot in products_json records what was said at the time; these say
    # where the live catalogue now disagrees with it.
    price_changed_from: float | None = None
    delisted: bool = False


# --------------------------------------------------------------------------- #
# What the tools hand back to the agent
#
# Tools return these structured types rather than free text, so the agent is
# given fields it cannot misread and the wording a shopper sees is decided here
# rather than improvised by the model. The size labels are the same three the
# product page uses, so the chat and the catalogue never contradict each other.
# --------------------------------------------------------------------------- #

#: At or below this count a size is called out as nearly gone.
LOW_STOCK_AT = 3


class SizeStock(BaseModel):
    """One size of one garment, with the shop's own wording for its state."""

    size: str
    quantity: int
    in_stock: bool
    #: "Sold out" / "Only 2 left" / "12 in stock" — identical to the product page.
    status: str

    @classmethod
    def from_row(cls, size: str, quantity: int) -> "SizeStock":
        if quantity == 0:
            status = "Sold out"
        elif quantity <= LOW_STOCK_AT:
            status = f"Only {quantity} left"
        else:
            status = f"{quantity} in stock"
        return cls(size=size, quantity=quantity, in_stock=quantity > 0, status=status)


class ProductInfo(BaseModel):
    """What a product-lookup tool returns.

    Deliberately led by the natural-language fields — `garment_type`,
    `description` and `search_tags` — because those are the words shoppers
    actually use. `name` is included so the agent can refer to the garment by
    the label printed on the product page, not as the thing it matches against.
    """

    product_id: str
    name: str
    garment_type: str
    description: str
    search_tags: list[str]
    colors: list[str]
    price: float
    inventory: list[SizeStock]
    total_stock: int
    available_sizes: list[str]
    sold_out_sizes: list[str]
    in_stock: bool

    @classmethod
    def from_product(cls, p: dict[str, Any]) -> "ProductInfo":
        sizes = [SizeStock.from_row(r["size"], r["quantity"]) for r in p["inventory"]]
        return cls(
            product_id=p["product_id"],
            name=p["name"],
            garment_type=p["garment_type"],
            description=p["description"],
            search_tags=p["search_tags"],
            colors=p["colors"],
            price=p["price"],
            inventory=sizes,
            total_stock=p["total_stock"],
            available_sizes=[s.size for s in sizes if s.in_stock],
            sold_out_sizes=[s.size for s in sizes if not s.in_stock],
            in_stock=any(s.in_stock for s in sizes),
        )


class SearchResult(BaseModel):
    """What `search_catalog` returns."""

    query: str = ""
    count: int
    products: list[ProductInfo]
    #: Set when nothing matched, so the agent is told what to do rather than guessing.
    note: str | None = None


class StockReport(BaseModel):
    """What `check_stock` returns — one garment, every size, nothing else."""

    product_id: str
    name: str
    price: float
    sizes: list[SizeStock]
    available_sizes: list[str]
    sold_out_sizes: list[str]
    total_stock: int
    #: Says sold-out is not the same as never-carried, and that there is no date.
    restock_note: str | None = None


class RecalledTurn(BaseModel):
    """One turn from an earlier visit, as the memory tool reports it."""

    role: str
    content: str
    #: Names only. The agent re-looks-up anything it intends to quote a price for.
    products: list[str] = Field(default_factory=list)
    when: str


class RecalledHistory(BaseModel):
    """What `recall_chat_history` returns."""

    count: int
    turns: list[RecalledTurn] = Field(default_factory=list)
    note: str | None = None


class ToolError(BaseModel):
    """Returned instead of raising, so the agent sees why and does not invent."""

    error: str
    guidance: str


class ProductList(BaseModel):
    count: int
    products: list[ProductCard]


class CategoryCount(BaseModel):
    category: str
    count: int


# --------------------------------------------------------------------------- #
# Accounts
# --------------------------------------------------------------------------- #


class PublicUser(BaseModel):
    """A user as the API returns them. Never carries the password hash."""

    id: int
    name: str
    email: str
    first_name: str | None = None
    last_name: str | None = None


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    #: No confirm field by design; length is the only rule enforced.
    password: str = Field(min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class ResetRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    user: PublicUser


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #


class PageContext(BaseModel):
    """Where the shopper is standing when they ask.

    Sent by the widget with every message so that "do you have this in navy?"
    has a referent. Everything here is derived from the browser's own route —
    never from anything the shopper types — so it cannot be used to smuggle
    instructions into the agent.
    """

    #: The current route, e.g. "/products/basic-hoodie-big-yale".
    path: str = Field(max_length=300)
    #: Set when the shopper is on a product detail page.
    product_id: str | None = Field(default=None, max_length=120)
    #: Set when a category filter is applied on the Products page.
    category: str | None = Field(default=None, max_length=60)


class CustomerContext(BaseModel):
    """Who the agent is talking to. Assembled server-side from the users table."""

    signed_in: bool
    first_name: str | None = None
    name: str | None = None
    email: str | None = None
    customer_since: str | None = None
    #: How many stored messages this shopper already has.
    past_messages: int = 0
    #: When they last spoke to the shop, if ever.
    last_seen: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    #: Set when a shopper is signed in; the turn is then persisted against them.
    user_id: int | None = None
    #: Where in the site the question was asked.
    page_context: PageContext | None = None
    #: Opaque Pydantic AI history returned by the previous reply. Pass it back
    #: verbatim; the client never needs to understand it.
    history: list[dict[str, Any]] = Field(default_factory=list)


class AppliedFilter(BaseModel):
    """The catalog filter a chat turn put in force.

    This is the state the page shows, and it **replaces** whatever was in force
    before rather than adding to it. A shopper who changes tack mid-conversation
    — "actually, show me jackets instead" — gets a new filter, not the old one
    with a jacket clause bolted on, which is how a set of dropdowns behaves and
    what the chat is standing in for.
    """

    query: str | None = None
    category: str | None = None
    color: str | None = None
    size: str | None = None
    max_price: float | None = None

    def label(self) -> str:
        """A short human reading of the filter, for the page to display."""
        bits: list[str] = []
        if self.query:
            bits.append(f"“{self.query}”")
        if self.category:
            bits.append(self.category)
        if self.color:
            bits.append(self.color)
        if self.size:
            bits.append(f"size {self.size}")
        if self.max_price is not None:
            bits.append(f"under ${self.max_price:,.0f}")
        return " · ".join(bits) or "everything"


class Selection(BaseModel):
    """One set of garments the assistant put in front of the shopper.

    Every search the assistant runs becomes one of these, so the conversation
    keeps a record of what was shown and when. The chat lists them, and the
    shopper can send any earlier one back to the page.
    """

    id: str
    label: str
    filter: AppliedFilter
    products: list[ProductCard] = Field(default_factory=list)
    created_at: str | None = None


class ChatTurn(BaseModel):
    """One stored turn, as the widget replays it."""

    id: int
    role: str
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    created_at: str
    #: Set on assistant turns that showed garments, so a replayed turn can be
    #: sent back to the page like a live one.
    selection_id: str | None = None


class ChatHistory(BaseModel):
    messages: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """The chat API contract.

    `products` is the structured search result the page renders. The agent does
    not describe garments in prose and leave the browser to parse them out — it
    returns them as data, and the frontend decides how they look. Everything the
    product grid and the detail view need is already on each `ProductCard`.
    """

    reply: str
    #: Garments the agent looked up this turn, rendered as cards on the page.
    products: list[ProductCard] = Field(default_factory=list)
    #: What the agent searched for, so the page can say what it is showing.
    #: None when the turn involved no catalog search.
    search_query: str | None = None
    #: The filter now in force on the page. Replaces any previous filter.
    filter: AppliedFilter | None = None
    #: This turn's result set, recorded so the shopper can return to it later.
    selection: Selection | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Agent dependencies
# --------------------------------------------------------------------------- #


@dataclass
class ChatDeps:
    """Per-request context handed to the agent and its tools.

    One instance per turn, never shared between turns. `seen` collects the
    garments the tools surfaced so the endpoint can return them as cards and
    store them on the assistant's row in `chat_messages`.
    """

    shopper_name: str | None = None
    #: None for a guest. Required by the memory tool, which cannot run without it.
    user_id: int | None = None
    #: Ties every tool call this turn to one entry group in the audit trail.
    run_id: str = ""
    customer: "CustomerContext | None" = None
    page: "PageContext | None" = None
    #: The filter the most recent search put in force, for the page to apply.
    last_filter: "AppliedFilter | None" = None
    seen: list[dict[str, Any]] = field(default_factory=list)
    #: Queries `search_catalog` ran this turn, so the reply can say what was
    #: searched for. The last one is the one the page labels its results with.
    queries: list[str] = field(default_factory=list)

    def remember(self, products: list[dict[str, Any]]) -> None:
        """Record products a tool looked up, de-duplicated, in the order seen."""
        known = {p["product_id"] for p in self.seen}
        for p in products:
            if p["product_id"] not in known:
                self.seen.append(p)
                known.add(p["product_id"])
