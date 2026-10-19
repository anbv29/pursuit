# ruff: noqa: F811
from types import SimpleNamespace as NS

import pytest
from sqlalchemy import func, select

from app.core.db import new_session
from app.models import BillingEvent, CheckoutOrder, CreditGrant
from tests.billing_support import billing_provider, signed_event  # noqa: F401


def test_public_catalog_has_launch_prices_and_original_allowances(api):
    response = api.get("/api/plans")
    assert response.status_code == 200
    plans = {p["id"]: p for p in response.json()}
    assert {
        key: (p["price_cents"], p["interval"], p["reports"], p["questions"], p["seats"])
        for key, p in plans.items()
    } == {
        "free": (0, "free", 0, 0, 1),
        "single": (499, "once", 1, 10, 1),
        "founder": (1199, "month", 3, 50, 1),
        "team": (3499, "month", 10, 200, 5),
    }


def start(api, plan="single"):
    api.signup()
    ws = api.workspace(paid=False)
    path = f"/api/workspaces/{ws}/billing"
    response = api.post(path + "/checkout", {"plan": plan, "product_id": "attacker-product", "quantity": 100})
    assert response.status_code == 200, response.text
    return ws, path, response.json()


def test_checkout_never_unlocks_and_uses_server_catalog(api, other, billing_provider):
    ws, path, order = start(api)
    assert billing_provider.sessions[0]["product_cart"] == [{"product_id": "pdt-single", "quantity": 1}]
    assert billing_provider.sessions[0]["billing_currency"] == "USD"
    assert billing_provider.sessions[0]["feature_flags"]["allow_currency_selection"] is False
    assert api.get(path).json()["research_remaining"] == 0
    assert other.get(path).status_code == 404
    assert other.post(path + "/checkout", {"plan": "team"}).status_code == 404
    assert api.post(path + "/checkout", {"plan": "single"}).json()["order_id"] == order["order_id"]
    assert len(billing_provider.sessions) == 1
    assert api.post(path + "/checkout", {"plan": "unknown"}).status_code == 422


def test_forged_signatures_and_duplicate_payments_cannot_grant_extra_credits(api, billing_provider):
    _, path, _ = start(api)
    billing_provider.paid()
    data = {"payment_id": "pay-synthetic"}
    assert signed_event(api, "payment.succeeded", data, valid=False).status_code == 401
    assert api.get(path).json()["research_remaining"] == 0
    response = signed_event(api, "payment.succeeded", data)
    assert response.status_code == 200, response.text
    assert signed_event(api, "payment.succeeded", data).json()["duplicate"] is True
    assert signed_event(api, "payment.succeeded", data, "evt-second-delivery").status_code == 200
    assert api.get(path).json()["research_remaining"] == 1
    assert api.get(path).json()["questions_remaining"] == 10
    with new_session() as db:
        assert db.scalar(select(func.count(CreditGrant.id))) == 1


def test_customer_mismatch_rolls_back_delivery_claim_and_can_retry(api, billing_provider):
    _, path, _ = start(api)
    paid = billing_provider.paid(customer=NS(customer_id="someone-else"))
    data = {"payment_id": paid.payment_id}
    assert signed_event(api, "payment.succeeded", data).status_code == 503
    with new_session() as db:
        assert db.get(BillingEvent, "evt-synthetic") is None
    assert api.get(path).json()["research_remaining"] == 0
    paid.customer.customer_id = "cus-synthetic"
    assert signed_event(api, "payment.succeeded", data).status_code == 200
    assert api.get(path).json()["research_remaining"] == 1


def test_refund_suspends_allowance_and_late_paid_event_cannot_restore_it(api, billing_provider):
    _, path, _ = start(api)
    billing_provider.paid()
    assert signed_event(api, "payment.succeeded", {"payment_id": "pay-synthetic"}).status_code == 200
    billing_provider.refunds_data["refund-one"] = NS(status="succeeded", payment_id="pay-synthetic")
    assert signed_event(api, "refund.succeeded", {"refund_id": "refund-one"}, "evt-refund").status_code == 200
    assert api.get(path).json()["suspended"] is True
    assert api.get(path).json()["research_remaining"] == 0
    assert (
        signed_event(api, "payment.succeeded", {"payment_id": "pay-synthetic"}, "evt-late").status_code == 200
    )
    assert api.get(path).json()["research_remaining"] == 0


def test_mispriced_product_is_rejected_before_checkout(api, billing_provider):
    api.signup()
    ws = api.workspace(paid=False)
    billing_provider.bad_price = True
    response = api.post(f"/api/workspaces/{ws}/billing/checkout", {"plan": "single"})
    assert response.status_code == 400
    assert billing_provider.sessions == []
    with new_session() as db:
        assert db.scalar(select(CheckoutOrder)).state == "FAILED"


def test_unconfigured_billing_and_demo_workspace_do_not_simulate_purchases(api):
    api.signup()
    ws = api.workspace(paid=False)
    status = api.get(f"/api/workspaces/{ws}/billing").json()
    assert status["plan"] == "free" and status["configured"] is False
    assert api.post(f"/api/workspaces/{ws}/billing/checkout", {"plan": "single"}).status_code == 400
    demo = api.post("/api/workspaces", {"name": "Demo", "with_demo_data": True}).json()["id"]
    assert api.post(f"/api/workspaces/{demo}/billing/checkout", {"plan": "team"}).status_code == 400
    assert api.get(f"/api/workspaces/{demo}/reports").json()[0]["company_name"].endswith("synthetic example")


@pytest.mark.parametrize("plan", ["single", "founder", "team"])
def test_tax_exclusive_product_cannot_open_checkout(api, billing_provider, plan):
    api.signup()
    ws = api.workspace(paid=False)
    billing_provider.tax_inclusive = False
    response = api.post(f"/api/workspaces/{ws}/billing/checkout", {"plan": plan})
    assert response.status_code == 400
    assert billing_provider.sessions == []
    assert api.get(f"/api/workspaces/{ws}/billing").json()["research_remaining"] == 0
