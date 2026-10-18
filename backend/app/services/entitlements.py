"""Paid allowances are enforced under a workspace lock; browser flags grant nothing."""

import uuid
from contextlib import contextmanager

from sqlalchemy import func, or_, select, update

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import PaymentRequired
from app.models import BillingAccount, BillingUse, CreditGrant, Workspace
from app.services.plans import PLANS


def plan(db, workspace_id):
    account = db.get(BillingAccount, workspace_id)
    if (
        account
        and account.environment == get_settings().dodo_environment
        and not account.suspended
        and account.status in ("active", "past_due")
        and account.period_end
        and account.period_end > utcnow()
    ):
        return account.plan if account.plan in ("founder", "team") else "free"
    return "free"


def eligible_grants(db, workspace_id):
    account = db.get(BillingAccount, workspace_id)
    if account and account.suspended:
        return []
    rows = db.scalars(
        select(CreditGrant)
        .where(
            CreditGrant.workspace_id == workspace_id,
            CreditGrant.environment == get_settings().dodo_environment,
            CreditGrant.revoked_at.is_(None),
            or_(CreditGrant.expires_at.is_(None), CreditGrant.expires_at > utcnow()),
        )
        .order_by(CreditGrant.expires_at.asc().nulls_last(), CreditGrant.created_at)
    )
    current = plan(db, workspace_id)
    return [
        g
        for g in rows
        if g.subscription_id is None
        or (current != "free" and account and g.subscription_id == account.subscription_id)
    ]


def remaining(db, grant, kind):
    used = db.scalar(
        select(func.count(BillingUse.id)).where(
            BillingUse.grant_id == grant.id,
            BillingUse.kind == kind,
            BillingUse.status.in_(["RESERVED", "CONSUMED"]),
        )
    )
    return max(0, getattr(grant, "questions" if kind == "question" else "reports") - used)


def require_feature(db, workspace_id):
    if plan(db, workspace_id) not in ("founder", "team"):
        raise PaymentRequired("This feature needs an active Founder or Team plan. Open Billing to upgrade.")


def reserve(db, workspace_id, kind, resource_key=None):
    db.execute(select(Workspace.id).where(Workspace.id == workspace_id).with_for_update())
    for grant in eligible_grants(db, workspace_id):
        if remaining(db, grant, kind) > 0:
            row = BillingUse(
                workspace_id=workspace_id,
                grant_id=grant.id,
                kind=kind,
                resource_key=resource_key or uuid.uuid4().hex,
            )
            db.add(row)
            db.flush()
            return row.id
    noun = "report questions" if kind == "question" else "research credits"
    raise PaymentRequired(f"No {noun} remaining. Open Billing to purchase or renew your plan.")


def finish(db, use_id, success):
    if use_id:
        db.execute(
            update(BillingUse)
            .where(BillingUse.id == use_id, BillingUse.status == "RESERVED")
            .values(status="CONSUMED" if success else "RELEASED")
        )


@contextmanager
def metered(db, workspace_id, kind):
    from app.services.ai_usage import BILLING_USE

    use_id = reserve(db, workspace_id, kind)
    db.commit()  # release quota lock before the AI cost ledger takes its own lock
    token = BILLING_USE.set(use_id)
    try:
        yield use_id
    except Exception:
        db.rollback()
        finish(db, use_id, False)
        db.commit()
        raise
    else:
        finish(db, use_id, True)
        db.commit()
    finally:
        BILLING_USE.reset(token)


def summary(db, workspace_id):
    current = plan(db, workspace_id)
    grants = eligible_grants(db, workspace_id)
    return {
        "plan": current if current != "free" else ("single" if grants else "free"),
        "seats": PLANS[current]["seats"],
        "research_remaining": sum(remaining(db, g, "research") for g in grants),
        "questions_remaining": sum(remaining(db, g, "question") for g in grants),
        "advanced_research": current in ("founder", "team"),
    }
