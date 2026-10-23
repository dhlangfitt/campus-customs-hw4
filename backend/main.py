"""FastAPI app for Campus Customs.

Run it from the backend/ folder:

    uvicorn main:app --reload --port 8000

Routes: the read-only catalog and product images, accounts (signup, login,
password reset), and the chat endpoint that puts the shopper in front of the
Pydantic AI agent in `agent.py`.
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import ModelMessagesTypeAdapter
from pydantic_core import to_jsonable_python

# backend/.env first; otherwise walk up for the workspace .env. Neither
# overrides a variable already set in the environment. Loaded before the agent
# is imported so it sees PORTKEY_API_KEY.
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(find_dotenv(usecwd=True))

import agent  # noqa: E402
import audit  # noqa: E402
import auth  # noqa: E402
import db  # noqa: E402
from models import (  # noqa: E402
    AppliedFilter,
    CategoryCount,
    ChatHistory,
    ChatTurn,
    CustomerContext,
    ChatRequest,
    ChatResponse,
    LoginRequest,
    ProductCard,
    ProductList,
    ResetRequest,
    Selection,
    SignupRequest,
    UserResponse,
)

logger = logging.getLogger("campus-customs")

app = FastAPI(title="Campus Customs API")


def _origins() -> list[str]:
    """Parse CORS_ORIGINS, tolerating bare hostnames from hosting dashboards."""
    out = []
    for raw in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","):
        o = raw.strip().rstrip("/")
        if not o:
            continue
        out.append(o if o.startswith(("http://", "https://")) else f"https://{o}")
    return out


# The Vite dev server is a different origin (5173), so CORS is explicit.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Product photos sit beside the database; the catalogue stores paths relative to
# it. /media matches the image_url values in the supplied chat history.
app.mount("/media", StaticFiles(directory=db.MEDIA_ROOT), name="media")


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #


@app.get("/api/health")
def health() -> dict:
    """Also reports how the agent is configured, without revealing the key."""
    return {
        "ok": True,
        "model": agent.model_name(),
        "agent_ready": bool(os.getenv("PORTKEY_API_KEY")),
    }


@app.get("/api/categories")
def categories() -> dict[str, list[CategoryCount]]:
    return {"categories": [CategoryCount(**c) for c in db.category_counts()]}


@app.get("/api/products")
def products(
    q: str | None = None,
    category: str | None = None,
    color: str | None = None,
    size: str | None = None,
    max_price: float | None = None,
    limit: int = 120,
) -> ProductList:
    """The catalog, filtered.

    `size` returns only garments with that size in stock — the same meaning the
    chat assistant's size filter has, so the two cannot disagree.
    """
    items = db.search_products(
        query=q, category=category, color=color, size=size, max_price=max_price,
        limit=min(limit, 120),
    )
    return ProductList(count=len(items), products=[ProductCard(**p) for p in items])


@app.get("/api/products/{product_id}")
def product(product_id: str) -> ProductCard:
    p = db.get_product(product_id)
    if not p:
        raise HTTPException(404, f"No product {product_id!r}")
    return ProductCard(**p)


# --------------------------------------------------------------------------- #
# Accounts
#
# Signup and login both go through auth.hash_password / auth.verify_password, so
# the hashing settings cannot drift between the two. No route here returns a
# password hash, and no password is written to a log or an error message.
# --------------------------------------------------------------------------- #


@app.post("/api/signup", status_code=201)
def signup(req: SignupRequest) -> UserResponse:
    user = db.create_user(
        first_name=req.first_name,
        last_name=req.last_name,
        email=str(req.email),
        password_hash=auth.hash_password(req.password),
    )
    if user is None:
        raise HTTPException(409, "An account already exists for that email.")
    return UserResponse(user=db.public_user(user))


@app.post("/api/login")
def login(req: LoginRequest) -> UserResponse:
    user = db.get_user_by_email(str(req.email))

    # Verify even when the email is unknown, against a throwaway hash, so that a
    # wrong email and a wrong password take the same time to answer and cannot
    # be told apart from outside.
    stored = user["password_hash"] if user else auth.hash_password("no-such-user")
    ok = auth.verify_password(req.password, stored)

    if not user or not ok:
        raise HTTPException(401, "Email or password is incorrect.")
    return UserResponse(user=db.public_user(user))


@app.post("/api/password-reset")
def password_reset(req: ResetRequest) -> dict:
    """Not yet implemented — no mail service is wired up.

    The reply is deliberately identical whether or not the address is on file,
    so this route cannot be used to discover who holds an account.
    """
    _ = req
    return {
        "sent": False,
        "message": "Password resets are not connected yet. Ask a staff member at 57 Broadway.",
    }


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #


def _refresh_card(stored: dict) -> ProductCard | None:
    """Rebuild one stored product card against the live catalogue.

    Decision 4: `products_json` is a snapshot of what the assistant said at the
    time, which is the right thing for an audit trail and the wrong thing for a
    shopper scrolling back to a card they are about to buy from. So the live
    row wins, and where it disagrees with the snapshot the card says so rather
    than silently showing either one.
    """
    product_id = stored.get("product_id")
    if not product_id:
        return None

    live = db.get_product(product_id)
    if live is None:
        # No longer in the catalogue. Keep what was said, and mark it.
        stored.setdefault("category", "Unknown")
        return ProductCard(**{**stored, "delisted": True})

    was = stored.get("price")
    changed = was if isinstance(was, (int, float)) and abs(was - live["price"]) > 0.005 else None
    return ProductCard(**live, price_changed_from=changed)


@app.get("/api/chat/{user_id}")
def chat_history(user_id: int) -> ChatHistory:
    """Past turns for a signed-in shopper, oldest first.

    Display only — this is what the shopper reads when they re-open the chat.
    It is not fed back to the agent as context; within-conversation memory is
    the opaque `history` blob that round-trips through the client.
    """
    if not db.get_user_by_id(user_id):
        raise HTTPException(404, f"No user {user_id}")

    turns = []
    for row in db.get_history(user_id):
        cards = [c for c in (_refresh_card(p) for p in row["products"]) if c]
        turns.append(
            ChatTurn(
                id=row["id"],
                role=row["role"],
                content=row["content"],
                products=cards,
                created_at=row["created_at"],
                selection_id=str(row["id"]) if cards else None,
            )
        )
    return ChatHistory(messages=turns)


def _customer_context(user: dict | None) -> CustomerContext:
    """Assemble what the agent is told about who it is talking to.

    Built here, from the users table and the stored message count — never from
    anything in the request body — so a shopper cannot claim to be somebody
    else by saying so in a message.
    """
    if not user:
        return CustomerContext(signed_in=False)

    stats = db.history_stats(user["id"])
    return CustomerContext(
        signed_in=True,
        first_name=user.get("first_name"),
        name=user.get("name"),
        email=user.get("email"),
        customer_since=user.get("created_at"),
        past_messages=stats["count"],
        last_seen=stats["last_seen"],
    )


@app.post("/api/chat")
async def chat(req: ChatRequest) -> ChatResponse:
    """One turn with the shop assistant.

    History round-trips through the client: the reply carries an opaque
    `history` that the next request passes straight back. A signed-in shopper's
    turns are also written to `chat_messages`, with the garments the agent
    looked up stored on the assistant row — the shape the supplied data uses.
    """
    user = db.get_user_by_id(req.user_id) if req.user_id else None
    if req.user_id and not user:
        raise HTTPException(404, f"No user {req.user_id}")

    history = (
        ModelMessagesTypeAdapter.validate_python(req.history) if req.history else []
    )

    if user:
        db.save_message(user["id"], "user", req.message)

    # Every turn opens and closes the audit trail with a matching run id, so a
    # turn's tool calls can be read together and no run is left without a
    # recorded reason for stopping.
    run_id = audit.new_run_id()
    started = time.perf_counter()
    audit.record(
        "run_start",
        run_id=run_id,
        args={"message": audit.clip_message(req.message)},
        user_id=user["id"] if user else None,
        extra={"page": req.page_context.path if req.page_context else None},
    )

    def _end(stop_reason: str, result: Any = None) -> None:
        audit.record(
            "run_end",
            run_id=run_id,
            stop_reason=stop_reason,
            result=result,
            duration_ms=int((time.perf_counter() - started) * 1000),
            user_id=user["id"] if user else None,
        )

    try:
        result, deps = await agent.ask(
            req.message,
            history=history,
            shopper_name=(user.get("first_name") or user["name"]) if user else None,
            user_id=user["id"] if user else None,
            customer=_customer_context(user),
            page=req.page_context,
            run_id=run_id,
        )
    except agent.MissingAPIKey as exc:
        _end(audit.STOP_NO_API_KEY, str(exc))
        raise HTTPException(503, str(exc)) from exc

    except UsageLimitExceeded as exc:
        # The loop ran long. Stop cleanly and say so, rather than failing.
        _end(audit.STOP_LOOP_LIMIT, str(exc))
        logger.warning("Agent hit a loop limit: %s", exc)
        stalled = (
            "I could not get to an answer on that one. Try asking for a "
            "specific garment, colour or size and I will look it up."
        )
        if user:
            db.save_message(user["id"], "assistant", stalled, [])
        return ChatResponse(reply=stalled, products=[], history=req.history)

    except Exception as exc:
        detail = str(exc)

        # The gateway runs its own content filter ahead of the model. A blocked
        # prompt is a refusal, not an outage, so answer in the assistant's own
        # voice rather than showing the shopper a 502.
        if "content_filter" in detail or "content management policy" in detail:
            refusal = (
                "I can't help with that. I'm here for Campus Customs apparel — "
                "finding garments, checking colors and sizes, comparing prices."
            )
            _end(audit.STOP_REFUSED, refusal)
            if user:
                db.save_message(user["id"], "assistant", refusal, [])
            return ChatResponse(reply=refusal, products=[], history=req.history)

        # Anything else is a real failure. The detail goes to the server log;
        # the browser gets a plain message rather than gateway internals.
        _end(audit.STOP_ERROR, detail)
        logger.exception("Agent call failed")
        raise HTTPException(502, "The shop assistant is unavailable right now.") from exc

    seen = deps.seen
    message_id = (
        db.save_message(user["id"], "assistant", result.output, seen) if user else None
    )

    cards = [ProductCard(**p) for p in seen]
    applied = deps.last_filter

    # Every turn that showed garments becomes a selection the shopper can come
    # back to. Signed-in turns are keyed to the stored row, so the link still
    # works after a reload; a guest's are keyed per reply and last the session.
    selection = None
    if cards:
        filt = applied or AppliedFilter(query=deps.queries[-1] if deps.queries else None)
        selection = Selection(
            id=str(message_id) if message_id else f"s-{uuid.uuid4().hex[:8]}",
            label=filt.label(),
            filter=filt,
            products=cards,
        )

    _end(
        audit.STOP_COMPLETED,
        {"reply": result.output, "products": len(cards)},
    )

    return ChatResponse(
        reply=result.output,
        products=cards,
        search_query=deps.queries[-1] if deps.queries else None,
        filter=applied,
        selection=selection,
        history=to_jsonable_python(result.all_messages()),
    )
