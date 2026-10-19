from datetime import timedelta
from typing import Literal

import dodopayments
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member, workspace_owner
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.core.errors import AppError
from app.core.ratelimit import limiter
from app.models import BillingAccount, CheckoutOrder, Membership, User
from app.services import checkout, entitlements, payment_provider
from app.services.plans import PLANS

router = APIRouter(tags=["billing"])


@router.get("/api/plans")
def plans():
    return [{"id": key, **value, "currency": "USD"} for key, value in PLANS.items()]


class Purchase(BaseModel):
    plan: Literal["single", "founder", "team"]


@router.get("/api/workspaces/{workspace_id}/allowance")
def allowance(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    return entitlements.summary(db, m.workspace_id)


@router.get("/api/workspaces/{workspace_id}/billing")
def status(m: Membership = Depends(workspace_owner), db: Session = Depends(get_db)):
    s = get_settings()
    account = db.get(BillingAccount, m.workspace_id)
    orders = db.scalars(
        select(CheckoutOrder)
        .where(CheckoutOrder.workspace_id == m.workspace_id)
        .order_by(CheckoutOrder.created_at.desc())
        .limit(10)
    )
    return entitlements.summary(db, m.workspace_id) | {
        "environment": s.dodo_environment,
        "configured": payment_provider.checkout_ready(),
        "provider_connected": payment_provider.configured(),
        "purchasable": {
            k: bool(v and payment_provider.checkout_ready())
            for k, v in payment_provider.product_ids().items()
        },
        "status": account.status if account else "inactive",
        "suspended": bool(account and account.suspended),
        "period_end": account.period_end if account else None,
        "cancel_at_period_end": bool(account and account.cancel_at_period_end),
        "portal_available": bool(
            account
            and account.customer_id
            and payment_provider.portal_ready()
            and account.environment == s.dodo_environment
        ),
        "seats_used": db.scalar(
            select(func.count(Membership.id)).where(Membership.workspace_id == m.workspace_id)
        ),
        "orders": [
            {
                "id": str(o.id),
                "plan": o.plan,
                "status": "EXPIRED"
                if o.state in ("CREATING", "OPEN", "UNKNOWN")
                and o.created_at < utcnow() - timedelta(hours=24)
                else o.state,
                "created_at": o.created_at,
            }
            for o in orders
        ],
    }


@router.post("/api/workspaces/{workspace_id}/billing/checkout")
def purchase(
    body: Purchase,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"checkout:{user.id}", limit=10, window_seconds=3600)
    if m.workspace.is_demo:
        raise AppError("Demo workspaces cannot be billed. Create a company workspace to buy a plan.")
    return checkout.start(db, m.workspace_id, user, body.plan)


@router.post("/api/workspaces/{workspace_id}/billing/portal")
def portal(
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"portal:{user.id}", limit=10, window_seconds=600)
    if not payment_provider.portal_ready():
        raise AppError("Billing portal setup is incomplete. Contact the workspace operator.")
    account = db.get(BillingAccount, m.workspace_id)
    if not account or not account.customer_id or account.environment != get_settings().dodo_environment:
        raise AppError("This workspace has no linked billing customer.")
    try:
        with payment_provider.client() as provider:
            result = provider.customers.customer_portal.create(
                account.customer_id,
                return_url=get_settings().public_app_url.rstrip("/") + f"/w/{m.workspace_id}/billing",
            )
        return {"url": payment_provider.hosted_url(result.link)}
    except dodopayments.APIError as exc:
        raise AppError("The billing portal is temporarily unavailable. No plan change was made.") from exc
