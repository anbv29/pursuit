"""Zero-priced research audit ledger; no payment grants or spend reservations."""

import json
from contextlib import contextmanager
from contextvars import ContextVar
from decimal import Decimal

from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.core.errors import AppError
from app.models.usage import UsageCall

CONTEXT = ContextVar("ai_usage_context", default=None)


@contextmanager
def scope(workspace_id, report_id=None, selected_model=None):
    token = CONTEXT.set((workspace_id, report_id, selected_model))
    try:
        yield
    finally:
        CONTEXT.reset(token)


def model(fallback=None):
    return get_settings().free_research_model


def preferred_model(db, workspace_id):
    return get_settings().free_research_model


def month_start():
    return utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def estimate(model_id, usage):
    if model_id != get_settings().free_research_model:
        raise AppError("Only the configured free model is allowed.")
    return Decimal("0")


def reserve(model_id, max_tokens, searches=0, operation="research", max_input=1000000):
    if model_id != get_settings().free_research_model or searches:
        raise AppError("Paid models and search tools are disabled.")
    current = CONTEXT.get()
    if current is None:
        return None
    with new_session() as db:
        row = UsageCall(
            workspace_id=current[0],
            report_id=current[1],
            model=model_id,
            operation=operation,
            reserved_usd=Decimal("0"),
        )
        db.add(row)
        db.commit()
        return row.id


def settle(call_id, message):
    if call_id is None:
        return
    with new_session() as db:
        row = db.get(UsageCall, call_id)
        measured = message is not None and getattr(message, "usage", None) is not None
        row.status = "COMPLETED" if measured else "UNKNOWN"
        row.usage = message.usage.model_dump(mode="json") if measured else None
        row.estimated_usd = Decimal("0")
        db.commit()


@contextmanager
def stream(client, **kwargs):
    tools = kwargs.get("tools", [])
    searches = sum(t.get("max_uses", 0) for t in tools if t.get("name") == "web_search")
    bound = 1_000_000 if tools else prompt_bound(kwargs)
    call = reserve(kwargs["model"], kwargs["max_tokens"], searches, max_input=bound)
    result = None
    try:
        with client.messages.stream(**kwargs) as response:
            yield response
            result = response.get_final_message()
    finally:
        settle(call, result)


def parse(client, **kwargs):
    operation = kwargs.pop("usage_operation", "answer")
    call = reserve(kwargs["model"], kwargs["max_tokens"], operation=operation, max_input=prompt_bound(kwargs))
    result = None
    try:
        result = client.messages.parse(**kwargs)
        return result
    finally:
        settle(call, result)


def prompt_bound(kwargs):
    # UTF-8 bytes bound text token count; allow additional system/schema overhead.
    return min(
        1_000_000,
        len(
            json.dumps(
                {"system": kwargs.get("system"), "messages": kwargs.get("messages")}, ensure_ascii=False
            ).encode()
        )
        + 8192,
    )
