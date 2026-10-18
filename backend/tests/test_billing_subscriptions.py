# ruff: noqa: F811
from datetime import timedelta
from types import SimpleNamespace as NS

from app.core.db import utcnow
from tests.billing_support import billing_provider, signed_event  # noqa: F401
from tests.test_billing_payments import start


def activate(api, provider):
    ws, path, _ = start(api, "founder")
    sub = NS(
        subscription_id="sub-synthetic",
        customer=NS(customer_id="cus-synthetic"),
        metadata=provider.sessions[-1]["metadata"],
        product_id="pdt-founder",
        quantity=1,
        on_demand=False,
        trial_period_days=0,
        status="active",
        cancel_at_next_billing_date=False,
        previous_billing_date=utcnow(),
        next_billing_date=utcnow() + timedelta(days=30),
    )
    provider.subscriptions_data[sub.subscription_id] = sub
    response = signed_event(api, "subscription.active", {"subscription_id": sub.subscription_id})
    assert response.status_code == 200, response.text
    return ws, path, sub


def sync(api, sub, event_id):
    return signed_event(api, "subscription.active", {"subscription_id": sub.subscription_id}, event_id)


def test_subscription_grants_once_per_cycle_and_renews(api, billing_provider):
    _, path, sub = activate(api, billing_provider)
    assert api.get(path).json()["research_remaining"] == 3
    assert sync(api, sub, "duplicate-cycle").status_code == 200
    assert api.get(path).json()["research_remaining"] == 3
    sub.previous_billing_date = sub.next_billing_date
    sub.next_billing_date += timedelta(days=30)
    assert sync(api, sub, "renewal-cycle").status_code == 200
    assert api.get(path).json()["plan"] == "founder"
    # The previous cycle's grant must expire, even if its renewal webhook arrives early.
    assert api.get(path).json()["research_remaining"] <= 6


def test_current_provider_state_wins_over_late_event(api, billing_provider):
    _, path, sub = activate(api, billing_provider)
    sub.status = "on_hold"
    assert sync(api, sub, "late-active").status_code == 200
    assert api.get(path).json()["research_remaining"] == 0
    assert api.get(path).json()["plan"] == "free"
    sub.status = "active"
    assert sync(api, sub, "recovered").status_code == 200
    assert api.get(path).json()["research_remaining"] == 3


def test_cancel_at_end_preserves_paid_period_then_expires(api, billing_provider):
    _, path, sub = activate(api, billing_provider)
    sub.status, sub.cancel_at_next_billing_date = "cancelled", True
    assert sync(api, sub, "cancel-end").status_code == 200
    assert api.get(path).json()["plan"] == "founder"
    sub.next_billing_date = utcnow() - timedelta(seconds=1)
    assert sync(api, sub, "expired").status_code == 200
    assert api.get(path).json()["research_remaining"] == 0


def test_second_subscription_and_workspace_deletion_are_blocked(api, billing_provider):
    ws, path, _ = activate(api, billing_provider)
    assert api.post(path + "/checkout", {"plan": "team"}).status_code == 409
    assert api.delete(f"/api/workspaces/{ws}").status_code == 400
    assert api.post(path + "/portal").status_code == 200
