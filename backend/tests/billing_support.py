import base64
import json
from types import SimpleNamespace as NS

import pytest
from dodopayments import DodoPayments
from standardwebhooks import Webhook

from app.core.config import get_settings
from app.core.db import utcnow
from app.services import payment_provider

SECRET = "whsec_" + base64.b64encode(b"synthetic-billing-signing-key-1234").decode()


class Provider:
    def __init__(self):
        self.sdk = DodoPayments(
            bearer_token="synthetic-test-key", environment="test_mode", webhook_key=SECRET
        )
        self.webhooks = self.sdk.webhooks  # real signature verification, never an HTTP request
        self.payments_data, self.subscriptions_data, self.refunds_data = {}, {}, {}
        self.sessions = []
        self.bad_price = False
        self.products = NS(retrieve=self.product)
        self.customers = NS(
            create=lambda **kw: NS(customer_id="cus-synthetic"),
            customer_portal=NS(
                create=lambda *a, **kw: NS(link="https://customer.dodopayments.com/synthetic")
            ),
        )
        self.checkout_sessions = NS(create=self.checkout)
        self.payments = NS(retrieve=lambda key: self.payments_data[key])
        self.subscriptions = NS(retrieve=lambda key: self.subscriptions_data[key])
        self.refunds = NS(retrieve=lambda key: self.refunds_data[key])

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def product(self, product_id):
        amount = {"pdt-single": 1500, "pdt-founder": 2900, "pdt-team": 7900}[product_id]
        recurring = product_id != "pdt-single"
        return NS(
            business_id="bus-synthetic",
            product_id=product_id,
            is_recurring=recurring,
            pricing_mode=None,
            price=NS(
                currency="USD",
                price=1 if self.bad_price else amount,
                discount=0,
                discount_bps=0,
                pay_what_you_want=False,
                purchasing_power_parity=False,
                trial_period_days=0,
                type="recurring_price" if recurring else "one_time_price",
                payment_frequency_count=1,
                payment_frequency_interval="Month",
            ),
        )

    def checkout(self, **kwargs):
        self.sessions.append(kwargs)
        return NS(
            session_id=f"session-{len(self.sessions)}",
            checkout_url="https://checkout.dodopayments.com/synthetic",
        )

    def paid(self, payment_id="pay-synthetic", **changes):
        values = dict(
            payment_id=payment_id,
            status="succeeded",
            customer=NS(customer_id="cus-synthetic"),
            metadata=self.sessions[-1]["metadata"],
            checkout_session_id=f"session-{len(self.sessions)}",
            product_cart=[NS(product_id=self.sessions[-1]["product_cart"][0]["product_id"], quantity=1)],
            subscription_id=None,
            is_multi_subscription=False,
            total_amount=1500,
        )
        values.update(changes)
        self.payments_data[payment_id] = NS(**values)
        return self.payments_data[payment_id]


@pytest.fixture
def billing_provider(monkeypatch):
    for key, value in {
        "DODO_PAYMENTS_API_KEY": "synthetic-test-key",
        "DODO_PAYMENTS_WEBHOOK_KEY": SECRET,
        "DODO_PAYMENTS_ENVIRONMENT": "test_mode",
        "BILLING_CHECKOUT_ENABLED": "true",
        "DODO_BUSINESS_ID": "bus-synthetic",
        "DODO_SINGLE_PRODUCT": "pdt-single",
        "DODO_FOUNDER_PRODUCT": "pdt-founder",
        "DODO_TEAM_PRODUCT": "pdt-team",
    }.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    provider = Provider()
    monkeypatch.setattr(payment_provider, "client", lambda: provider)
    yield provider
    provider.sdk.close()
    get_settings.cache_clear()


def signed_event(api, kind, data, event_id="evt-synthetic", *, valid=True):
    now = utcnow()
    payload = json.dumps(
        {"business_id": "bus-synthetic", "type": kind, "timestamp": now.isoformat(), "data": data}
    )
    signature = Webhook(SECRET).sign(event_id, now, payload) if valid else "v1,AAAA"
    return api.client.post(
        "/api/billing/webhook",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "webhook-id": event_id,
            "webhook-timestamp": str(int(now.timestamp())),
            "webhook-signature": signature,
        },
    )
