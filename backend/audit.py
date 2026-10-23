"""Append-only audit trail for the agent loop.

Writes `output/audit_trail.json`: one JSON array, appended to across runs and
across server restarts. It is never truncated on startup — if the file exists,
new entries are added to it.

The point is debugging, not observability-as-a-product. There is no metrics
backend, no tracing, no sampling. One file, readable in any editor, answering
three questions after the fact:

* what did the agent actually do on that turn,
* what did each tool get handed and give back,
* and why did the loop stop.

**Size is controlled by capping, not by dropping entries.** Every free-text
field is truncated to a fixed length, so one entry costs roughly a kilobyte no
matter how large the prompt or the tool result was. When the file passes
`AUDIT_MAX_ENTRIES` it is rotated to a numbered archive rather than overwritten,
so nothing is ever destroyed to save space.

**What is deliberately excluded:** passwords, password hashes, API keys, and
message history. Credentials never reach this module; the history blob is
excluded because it is large, opaque and duplicates what is already recorded
turn by turn.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

#: output/ sits beside backend/.
AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"

#: Per-field caps. Chosen so a busy turn stays a few kilobytes.
MAX_ARG_CHARS = int(os.getenv("AUDIT_MAX_ARG_CHARS", "220"))
MAX_RESULT_CHARS = int(os.getenv("AUDIT_MAX_RESULT_CHARS", "600"))
MAX_MESSAGE_CHARS = int(os.getenv("AUDIT_MAX_MESSAGE_CHARS", "240"))

#: Rotate rather than grow without bound.
AUDIT_MAX_ENTRIES = int(os.getenv("AUDIT_MAX_ENTRIES", "5000"))

#: Never written to the trail, whatever they are called.
REDACTED_KEYS = {
    "password", "password_hash", "api_key", "portkey_api_key",
    "openai_api_key", "token", "secret", "authorization",
}

#: Stop reasons. Every run records exactly one.
STOP_COMPLETED = "completed"
STOP_LOOP_LIMIT = "loop_limit"
STOP_ERROR = "error"
STOP_REFUSED = "refused_content_filter"
STOP_NO_API_KEY = "no_api_key"

_lock = threading.Lock()


def new_run_id() -> str:
    """One id per chat turn, so a turn's entries can be read together."""
    return f"run-{uuid.uuid4().hex[:10]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clip(value: Any, limit: int) -> Any:
    """Shorten a value for the trail, marking it when something was cut."""
    if value is None or isinstance(value, (int, float, bool)):
        return value
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    if len(text) <= limit:
        return text
    return text[:limit] + f"…[+{len(text) - limit} chars]"


def _clean_args(args: dict[str, Any] | None) -> dict[str, Any]:
    """Cap each argument, and drop anything that looks like a credential."""
    if not args:
        return {}
    out: dict[str, Any] = {}
    for key, value in args.items():
        if key.lower() in REDACTED_KEYS:
            out[key] = "[redacted]"
        else:
            out[key] = _clip(value, MAX_ARG_CHARS)
    return out


def _read() -> list[dict[str, Any]]:
    if not AUDIT_PATH.exists():
        return []
    try:
        data = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        # A damaged trail is archived rather than silently replaced.
        _archive(suffix="corrupt")
        return []


def _archive(suffix: str) -> None:
    if not AUDIT_PATH.exists():
        return
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    AUDIT_PATH.rename(AUDIT_PATH.with_name(f"audit_trail.{suffix}.{stamp}.json"))


def record(
    event: str,
    *,
    run_id: str,
    tool: str | None = None,
    args: dict[str, Any] | None = None,
    result: Any = None,
    stop_reason: str | None = None,
    duration_ms: int | None = None,
    user_id: int | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Append one entry. Never raises: a failed write must not fail a shopper's turn."""
    entry = {
        "ts": _now(),
        "run_id": run_id,
        "event": event,
        "tool": tool,
        "args": _clean_args(args),
        "result": _clip(result, MAX_RESULT_CHARS),
        "stop_reason": stop_reason,
        "duration_ms": duration_ms,
        "user": user_id if user_id is not None else "guest",
    }
    if extra:
        entry.update({k: _clip(v, MAX_ARG_CHARS) for k, v in extra.items()})

    try:
        with _lock:
            entries = _read()
            if len(entries) >= AUDIT_MAX_ENTRIES:
                _archive(suffix="part")
                entries = []
            entries.append(entry)
            AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
            tmp = AUDIT_PATH.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(entries, indent=2), encoding="utf-8")
            tmp.replace(AUDIT_PATH)  # atomic, so a crash cannot leave half a file
    except OSError:
        pass
    return entry


def clip_message(text: str) -> str:
    """The shopper's message, shortened for the trail."""
    return _clip(text, MAX_MESSAGE_CHARS)
