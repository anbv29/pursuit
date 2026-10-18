"""Meter provider-reported tokens; reserve estimated budgets before each request.

Rates verified 2026-10-18 against Anthropic pricing. Estimates are not invoices.
Unknown/failed calls retain reservations, since a timed-out call may be billable.
"""

import json
from contextlib import contextmanager
from contextvars import ContextVar
from decimal import Decimal

from sqlalchemy import func, select

from app.core.db import new_session, utcnow
from app.core.errors import AppError
from app.models import BillingUse, Workspace
from app.models.usage import UsageCall, WorkspaceBudget
from app.services.plans import PLANS

MODELS = {"claude-haiku-5-5": (0.10, 0.50), "claude-sonnet-5-5": (2, 10), "claude-opus-5-5": (4, 20)}
CONTEXT = ContextVar("ai_usage_context", default=None)
BILLING_USE = ContextVar("billing_use", default=None)


@contextmanager
def scope(workspace_id, report_id=None, selected_model=None):
    token = CONTEXT.set((workspace_id, report_id, selected_model))
    try:
        yield
    finally:
        CONTEXT.reset(token)


def model(fallback):
    current = CONTEXT.get()
    return current[2] if current and current[2] else fallback


def preferred_model(db, workspace_id):
    return "claude-haiku-5-5"  # included paid allowances are priced for Haiku


def month_start():
    return utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def estimate(model_id, usage):
    base, output = MODELS[model_id]
    raw = int(usage.get("input_tokens", 0))
    read = int(usage.get("cache_read_input_tokens", 0) or 0)
    write = int(usage.get("cache_creation_input_tokens", 0) or 0)
    if model_id == "claude-haiku-5-5" and raw + read + write > 100_000:
        base, output = 0.5, 2.5
    searches = (usage.get("server_tool_use") or {}).get("web_search_requests", 0)
    # Conservative 1h cache-write price; requests here do not explicitly enable caching.
    amount = (
        raw * base + read * base * 0.1 + write * base * 2 + int(usage.get("output_tokens", 0)) * output
    ) / 1_000_000
    return Decimal(str(amount + searches * 0.01)).quantize(Decimal("0.000001"))


def reserve(model_id, max_tokens, searches=0, operation="research", max_input=1_000_000):
    current = CONTEXT.get()
    if current is None:
        return None
    if model_id not in MODELS:
        raise AppError("This model has no configured pricing. Choose a supported model in Settings.")
    # Reserve at the long-context rate for a whole context window plus output and search.
    base, output = MODELS[model_id]
    if model_id == "claude-haiku-5-5" and max_input > 100_000:
        base, output = 0.5, 2.5
    amount = Decimal(str((max_input * base + max_tokens * output) / 1_000_000 + searches * 0.01))
    with new_session() as db:
        db.execute(select(Workspace.id).where(Workspace.id == current[0]).with_for_update())
        budget = db.get(WorkspaceBudget, current[0])
        limit = budget.monthly_limit_usd if budget else Decimal("25")
        used = db.scalar(
            select(
                func.coalesce(func.sum(func.coalesce(UsageCall.estimated_usd, UsageCall.reserved_usd)), 0)
            ).where(UsageCall.workspace_id == current[0], UsageCall.created_at >= month_start())
        )
        if used + amount > limit:
            raise AppError(
                "Workspace AI budget reached. An owner can adjust it in Settings.", "budget_exceeded"
            )
        use_id = BILLING_USE.get()
        if use_id:
            use = db.get(BillingUse, use_id)
            from app.services.entitlements import eligible_grants

            allowed = {g.id: g for g in eligible_grants(db, current[0])}
            if (
                not use
                or use.workspace_id != current[0]
                or use.status != "RESERVED"
                or use.grant_id not in allowed
            ):
                raise AppError("This research allowance is no longer available.", "allowance_unavailable")
            grant = allowed[use.grant_id]
            total = func.coalesce(UsageCall.estimated_usd, UsageCall.reserved_usd)
            job_cost = db.scalar(
                select(func.coalesce(func.sum(total), 0)).where(UsageCall.billing_use_id == use_id)
            )
            grant_cost = db.scalar(
                select(func.coalesce(func.sum(total), 0))
                .join(BillingUse, BillingUse.id == UsageCall.billing_use_id)
                .where(BillingUse.grant_id == grant.id)
            )
            job_limit = Decimal("0.10") if use.kind == "question" else Decimal("2.00")
            grant_limit = Decimal(PLANS[grant.plan]["price_cents"]) / 100 * Decimal("0.30")
            if (
                model_id != "claude-haiku-5-5"
                or job_cost + amount > job_limit
                or grant_cost + amount > grant_limit
            ):
                raise AppError(
                    "AI safety budget reached for this request or allowance. "
                    "Contact support; no extra charge was made.",
                    "budget_exceeded",
                )
        row = UsageCall(
            workspace_id=current[0],
            report_id=current[1],
            model=model_id,
            operation=operation,
            billing_use_id=use_id,
            reserved_usd=amount,
        )
        db.add(row)
        db.commit()
        return row.id


def settle(call_id, message):
    if call_id is None:
        return
    with new_session() as db:
        row = db.get(UsageCall, call_id)
        if message is None or not getattr(message, "usage", None):
            row.status = "UNKNOWN"
        else:
            raw = message.usage.model_dump(mode="json")
            row.usage = raw
            row.estimated_usd = estimate(row.model, raw)
            row.status = "COMPLETED"
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
    call = reserve(kwargs["model"], kwargs["max_tokens"], operation="answer", max_input=prompt_bound(kwargs))
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
