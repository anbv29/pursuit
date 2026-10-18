"""Fulfill only verified provider resources belonging to a server-created checkout."""

import uuid

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import AppError
from app.models import BillingAccount, CheckoutOrder, CreditGrant, Workspace
from app.services import audit, payment_provider
from app.services.plans import PLANS


def bound_order(db, resource):
    raw = (resource.metadata or {}).get("pursuit_order_id")
    try:
        order_id = uuid.UUID(raw)
    except (ValueError, TypeError, AttributeError):
        return None, None  # another product in the same merchant account
    order = db.get(CheckoutOrder, order_id)
    if order is None:
        return None, None
    db.execute(select(Workspace.id).where(Workspace.id == order.workspace_id).with_for_update())
    account = db.get(BillingAccount, order.workspace_id)
    db.refresh(account)
    if (
        order.environment != get_settings().dodo_environment
        or account.environment != order.environment
        or resource.customer.customer_id != account.customer_id
    ):
        raise AppError("Payment resource does not match its workspace checkout.")
    session = getattr(resource, "checkout_session_id", None)
    if session and order.session_id and session != order.session_id:
        raise AppError("Payment session does not match its checkout order.")
    return order, account


def grant(db, order, key, slug, *, payment_id=None, subscription_id=None, expires=None):
    row = db.scalar(select(CreditGrant).where(CreditGrant.source_key == key))
    if row is None:
        row = CreditGrant(
            workspace_id=order.workspace_id,
            source_key=key,
            plan=slug,
            environment=order.environment,
            payment_id=payment_id,
            subscription_id=subscription_id,
            expires_at=expires,
            reports=PLANS[slug]["reports"],
            questions=PLANS[slug]["questions"],
        )
        db.add(row)
    elif subscription_id:
        row.plan, row.reports, row.questions = slug, PLANS[slug]["reports"], PLANS[slug]["questions"]
    return row


def payment(db, provider, payment_id):
    paid = provider.payments.retrieve(payment_id)
    order, account = bound_order(db, paid)
    if order is None:
        return
    if paid.status != "succeeded":
        if order.state != "PAID":
            order.state = "FAILED"
        return
    if paid.subscription_id or paid.is_multi_subscription:
        return  # subscriptions are fulfilled only from subscription state
    if account.suspended:
        order.state = "REVIEW"
        return
    cart = paid.product_cart or []
    if (
        order.plan != "single"
        or len(cart) != 1
        or cart[0].product_id != order.product_id
        or cart[0].quantity != 1
        or paid.total_amount <= 0
    ):
        raise AppError("Paid cart does not match the purchased report pack.")
    grant(db, order, f"payment:{paid.payment_id}", "single", payment_id=paid.payment_id)
    order.state, order.payment_id = "PAID", paid.payment_id
    audit.record(db, "billing.pack_paid", workspace_id=order.workspace_id, detail={"order": str(order.id)})


def subscription(db, provider, subscription_id):
    sub = provider.subscriptions.retrieve(subscription_id)
    order, account = bound_order(db, sub)
    if order is None:
        return
    # Re-read while holding the workspace lock: delayed events cannot restore stale access.
    sub = provider.subscriptions.retrieve(subscription_id)
    if sub.customer.customer_id != account.customer_id:
        raise AppError("Subscription customer changed during verification.")
    if (
        account.subscription_id
        and account.subscription_id != sub.subscription_id
        and account.status
        not in (
            "cancelled",
            "expired",
            "failed",
            "inactive",
        )
    ):
        return  # a stale event cannot replace another active subscription
    slug = next(
        (
            k
            for k, value in payment_provider.product_ids().items()
            if value == sub.product_id and k in ("founder", "team")
        ),
        None,
    )
    if not slug or sub.quantity != 1 or sub.on_demand or sub.trial_period_days:
        raise AppError("Subscription does not match an approved paid plan.")
    status = sub.status
    if status == "cancelled" and sub.cancel_at_next_billing_date and sub.next_billing_date > utcnow():
        status = "active"
    account.subscription_id, account.plan, account.status = sub.subscription_id, slug, status
    account.period_end, account.cancel_at_period_end = sub.next_billing_date, sub.cancel_at_next_billing_date
    if status in ("active", "past_due") and sub.next_billing_date > utcnow() and not account.suspended:
        grant(
            db,
            order,
            f"subscription:{sub.subscription_id}:{sub.previous_billing_date.isoformat()}",
            slug,
            subscription_id=sub.subscription_id,
            expires=sub.next_billing_date,
        )
        order.state = "PAID"
    audit.record(
        db,
        "billing.subscription_sync",
        workspace_id=order.workspace_id,
        detail={"status": status, "plan": slug},
    )


def revoke(db, provider, payment_id):
    paid = provider.payments.retrieve(payment_id)
    order, account = bound_order(db, paid)
    if order is None:
        return
    rows = db.scalars(select(CreditGrant).where(CreditGrant.workspace_id == order.workspace_id))
    for row in rows:
        if row.payment_id == payment_id or (
            paid.subscription_id and row.subscription_id == paid.subscription_id
        ):
            row.revoked_at = utcnow()
    account.suspended = True  # partial refunds/disputes require explicit operator review
    audit.record(
        db, "billing.payment_review", workspace_id=order.workspace_id, detail={"payment_id": payment_id}
    )
