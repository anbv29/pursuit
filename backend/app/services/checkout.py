from datetime import timedelta

import dodopayments
from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import AppError, Conflict
from app.models import BillingAccount, CheckoutOrder, Workspace
from app.services import audit, payment_provider


def start(db, workspace_id, user, slug):
    s = get_settings()
    product_id = payment_provider.product_ids().get(slug)
    if not product_id or not payment_provider.checkout_ready():
        raise AppError(
            "This plan is not available for purchase yet. No payment was taken.", "billing_unavailable"
        )
    db.execute(select(Workspace.id).where(Workspace.id == workspace_id).with_for_update())
    account = db.get(BillingAccount, workspace_id)
    if account is None:
        account = BillingAccount(workspace_id=workspace_id, environment=s.dodo_environment)
        db.add(account)
    if account.environment != s.dodo_environment or account.suspended:
        raise AppError("Billing needs operator review before another purchase.")
    if (
        slug != "single"
        and account.subscription_id
        and account.status not in ("expired", "cancelled", "failed")
    ):
        raise Conflict("Manage your existing subscription through the billing portal instead.")
    pending = db.scalar(
        select(CheckoutOrder)
        .where(
            CheckoutOrder.workspace_id == workspace_id,
            CheckoutOrder.state.in_(["CREATING", "OPEN", "UNKNOWN"]),
            CheckoutOrder.created_at > utcnow() - timedelta(hours=24),
        )
        .order_by(CheckoutOrder.created_at.desc())
        .limit(1)
    )
    if pending:
        if pending.plan == slug and pending.state == "OPEN":
            return {"url": pending.checkout_url, "order_id": str(pending.id)}
        raise Conflict(
            "A checkout is already open or uncertain. Complete it or ask the operator to reconcile it."
        )
    order = CheckoutOrder(
        workspace_id=workspace_id,
        actor_id=user.id,
        plan=slug,
        product_id=product_id,
        environment=s.dodo_environment,
    )
    db.add(order)
    db.commit()
    try:
        with payment_provider.client() as provider:
            payment_provider.verify_product(provider.products.retrieve(product_id), slug)
            if not account.customer_id:
                customer = provider.customers.create(
                    email=user.email, name=user.name, metadata={"pursuit_workspace_id": str(workspace_id)}
                )
                account.customer_id = customer.customer_id
                db.commit()
            kwargs = {
                "product_cart": [{"product_id": product_id, "quantity": 1}],
                "customer": {"customer_id": account.customer_id},
                "metadata": {"pursuit_order_id": str(order.id)},
                "return_url": s.public_app_url.rstrip("/") + f"/w/{workspace_id}/billing",
                "billing_currency": "USD",
                "feature_flags": {"allow_discount_code": False, "allow_currency_selection": False},
            }
            if slug != "single":
                kwargs["subscription_data"] = {"trial_period_days": 0}
            session = provider.checkout_sessions.create(**kwargs)
            url = payment_provider.hosted_url(session.checkout_url)
            db.refresh(order)
            order.session_id, order.checkout_url = session.session_id, url
            if order.state == "CREATING":
                order.state = "OPEN"
            audit.record(
                db,
                "billing.checkout",
                actor_id=user.id,
                workspace_id=workspace_id,
                detail={"plan": slug, "environment": s.dodo_environment},
            )
            db.commit()
            return {"url": url, "order_id": str(order.id)}
    except (AppError, dodopayments.APIError) as exc:
        db.rollback()
        order = db.get(CheckoutOrder, order.id)
        order.state = "FAILED" if isinstance(exc, AppError) else "UNKNOWN"
        db.commit()
        raise AppError(
            "Checkout could not be prepared. No plan was unlocked; check Billing before retrying."
        ) from exc
