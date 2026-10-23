"""The Campus Customs shop assistant — a Pydantic AI agent.

Three things live here and nowhere else: loading the system prompt from
`prompts/prompt.md`, pointing the OpenAI-compatible client at the Portkey
gateway, and registering the tools from `tools.py`.

The agent is built once and cached. A Pydantic AI `Agent` is stateless across
runs, so one instance serves every shopper; conversation state travels in the
message history the caller passes in, never in this module.
"""

from __future__ import annotations

import os
from functools import cache
from pathlib import Path

from pydantic_ai import Agent
from pydantic_ai.usage import UsageLimits
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings
from pydantic_ai.providers.openai import OpenAIProvider

import db
import tools
from models import ChatDeps

#: The system prompt lives in a file so it can be edited without touching code.
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "prompt.md"

#: Portkey is an OpenAI-compatible gateway, so the OpenAI provider works as-is
#: with base_url pointed at it.
DEFAULT_BASE_URL = "https://api.portkey.ai/v1"

#: Agents.md sets the workspace default and requires it stay configurable.
DEFAULT_MODEL = "gpt-5.6-luna"

# --------------------------------------------------------------------------- #
# Loop limits
#
# The agent calls tools in a loop: model, tool, model again. A malformed
# question, or a model that keeps re-searching, can spin. These bound it, so a
# turn either finishes or stops with a reason rather than running forever.
#
# Six tool calls is generous for this shop — a thorough answer is a search plus
# two or three stock checks — and eight model requests allows for that plus a
# retry.
# --------------------------------------------------------------------------- #

#: Model requests per turn.
REQUEST_LIMIT = int(os.getenv("AGENT_REQUEST_LIMIT", "8"))

#: Tool calls per turn.
TOOL_CALLS_LIMIT = int(os.getenv("AGENT_TOOL_CALLS_LIMIT", "6"))


def usage_limits() -> UsageLimits:
    return UsageLimits(request_limit=REQUEST_LIMIT, tool_calls_limit=TOOL_CALLS_LIMIT)


class MissingAPIKey(RuntimeError):
    """Raised when no gateway key is configured, so the API can answer 503."""


def model_name() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_MODEL)


def load_prompt() -> str:
    """Read the system prompt from disk.

    Not cached: during development the file is edited often, and a restart to
    pick up a wording change is a poor trade for one small read per turn.
    """
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def _model() -> OpenAIChatModel:
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise MissingAPIKey(
            "PORTKEY_API_KEY is not set. Copy .env.example to .env in the "
            "hw4 folder and fill it in, or export the variable before starting "
            "the server."
        )
    provider = OpenAIProvider(
        base_url=os.getenv("PORTKEY_BASE_URL", DEFAULT_BASE_URL),
        api_key=api_key,
    )
    return OpenAIChatModel(model_name(), provider=provider)


@cache
def build_agent() -> Agent[ChatDeps, str]:
    """Build and cache the agent. Tools come from tools.py, prompt from disk."""
    agent = Agent(
        _model(),
        deps_type=ChatDeps,
        name="campus-customs",
        tools=tools.ALL_TOOLS,
        # The luna models refuse function tools over /v1/chat/completions unless
        # reasoning effort is 'none'. This agent is all tools, so default it off.
        model_settings=OpenAIChatModelSettings(
            openai_reasoning_effort=os.getenv("LLM_REASONING_EFFORT", "none"),
        ),
    )

    @agent.instructions
    def system_prompt() -> str:
        """The contents of prompts/prompt.md, re-read each turn."""
        return load_prompt()

    @agent.instructions
    def shop_context() -> str:
        """Facts about this shop that would otherwise have to be looked up."""
        categories = ", ".join(
            f"{c['category']} ({c['count']})" for c in db.category_counts()
        )
        return (
            f"The shop carries {sum(c['count'] for c in db.category_counts())} "
            f"garments in these categories: {categories}. "
            "Sizes run XS, S, M, L, XL, XXL."
        )

    @agent.instructions
    def customer_context(ctx) -> str:
        """Who is on the other side of the conversation.

        Assembled server-side from the users table, never from anything the
        shopper typed, so it cannot be spoofed from inside a message.
        """
        c = ctx.deps.customer
        if c is None or not c.signed_in:
            return (
                "The shopper is browsing as a guest. You do not know their name "
                "and the shop has no saved history for them. Help them exactly "
                "as you would a signed-in customer. Do not ask them to sign in; "
                "mention an account only if they ask you to remember something."
            )

        lines = [f"You are helping {c.first_name or c.name}, a signed-in customer."]
        if c.name and c.first_name and c.name != c.first_name:
            lines.append(f"Their full name is {c.name}.")
        if c.email:
            lines.append(
                f"Their account email is {c.email}. It is there so you can "
                "confirm which account they are in if they ask — do not read it "
                "back to them otherwise, and never ask them to retype it."
            )
        if c.customer_since:
            lines.append(f"They have had an account since {c.customer_since[:10]}.")
        return " ".join(lines)

    @agent.instructions
    def memory_context(ctx) -> str:
        """Tell the agent that memory exists, without pasting it all in.

        The count and date are cheap; the conversation itself is not, and most
        turns do not need it. So the agent is told what is there and left to
        fetch it with `recall_chat_history` when the shopper's question actually
        reaches back.
        """
        c = ctx.deps.customer
        if c is None or not c.signed_in:
            return ""
        if not c.past_messages:
            return "This is the first conversation this customer has had with the shop."
        when = f" Their last visit was {c.last_seen[:10]}." if c.last_seen else ""
        return (
            f"This customer has {c.past_messages} earlier messages saved with the "
            f"shop.{when} You cannot see them from here. If what they ask refers "
            "to an earlier visit, call recall_chat_history to read it before "
            "answering — never guess at what they asked before."
        )

    @agent.instructions
    def filter_context(ctx) -> str:
        """What the page is currently showing, so the model knows its search
        drives a visible filter rather than just a list in the chat."""
        f = ctx.deps.last_filter
        if f is None:
            return (
                "Every search you run becomes the filter shown on the shop's "
                "product page. Pass the shopper's constraints as arguments — "
                "category, color, size, max_price — rather than folding them "
                "into the query text, because each argument becomes a filter "
                "the shopper can see and remove."
            )
        return f"The page is currently filtered to: {f.label()}."

    @agent.instructions
    def page_context(ctx) -> str:
        """What the shopper is looking at while they type.

        This is what makes "do you have this in navy?" answerable. The values
        come from the browser's route, not from the message, so they are facts
        about the session rather than claims the shopper has made.
        """
        page = ctx.deps.page
        if page is None:
            return ""

        if page.product_id:
            product = db.get_product(page.product_id)
            if product:
                return (
                    f"The shopper is looking at the product page for "
                    f"{product['name']} (product_id: {product['product_id']}), "
                    f"${product['price']:.2f}. Words like \"this\", \"it\" or "
                    "\"this one\" mean this garment unless they clearly mean "
                    "something else. Still call the tools before stating anything "
                    "about its price, colors or stock."
                )
        if page.category:
            return (
                f"The shopper is browsing the {page.category} category. If they "
                "ask for something without naming a garment type, start there."
            )
        if page.path == "/":
            return "The shopper is on the home page and has not started browsing yet."
        if page.path.startswith("/products"):
            return "The shopper is on the product listing page."
        return ""

    return agent


async def ask(
    message: str,
    history: list | None = None,
    shopper_name: str | None = None,
    user_id: int | None = None,
    customer=None,
    page=None,
    run_id: str = "",
):
    """Run one turn of conversation.

    Returns `(result, deps)`. `result.output` is the reply text,
    `result.all_messages()` is the history to persist and hand back next turn,
    and `deps` carries the garments the tools surfaced and the queries they ran.
    """
    deps = ChatDeps(
        shopper_name=shopper_name, user_id=user_id, customer=customer,
        page=page, run_id=run_id,
    )
    result = await build_agent().run(
        message,
        deps=deps,
        message_history=history or [],
        usage_limits=usage_limits(),
    )
    return result, deps
