# ruff: noqa: F811
import pytest

from app.core.config import Settings, get_settings
from app.services import payment_provider
from tests.billing_support import billing_provider, signed_event  # noqa: F401


def test_checkout_pause_still_accepts_valid_fulfillment(api, billing_provider, monkeypatch):
    api.signup()
    workspace = api.workspace(paid=False)
    path = f"/api/workspaces/{workspace}/billing"
    assert api.post(path + "/checkout", {"plan": "single"}).status_code == 200
    billing_provider.paid()
    monkeypatch.setenv("BILLING_CHECKOUT_ENABLED", "false")
    get_settings.cache_clear()
    status = api.get(path).json()
    assert status["provider_connected"] and not status["configured"]
    assert api.post(path + "/checkout", {"plan": "team"}).status_code == 400
    assert len(billing_provider.sessions) == 1
    assert signed_event(api, "payment.succeeded", {"payment_id": "pay-synthetic"}).status_code == 200
    assert api.get(path).json()["research_remaining"] == 1


@pytest.mark.no_database
@pytest.mark.parametrize("origin", ["http://localhost:3000", "https://example.invalid", "https://localhost"])
def test_live_checkout_refuses_unready_origins(monkeypatch, origin):
    settings = Settings(
        _env_file=None,
        DODO_PAYMENTS_API_KEY="synthetic",
        DODO_PAYMENTS_WEBHOOK_KEY="synthetic",
        DODO_PAYMENTS_ENVIRONMENT="live_mode",
        dodo_business_id="synthetic",
        public_app_url=origin,
        billing_checkout_enabled=True,
    )
    monkeypatch.setattr(payment_provider, "get_settings", lambda: settings)
    assert payment_provider.configured()
    assert not payment_provider.checkout_ready()


@pytest.mark.no_database
def test_live_checkout_requires_explicit_enable_without_blocking_portal(monkeypatch):
    settings = Settings(
        _env_file=None,
        DODO_PAYMENTS_API_KEY="synthetic",
        DODO_PAYMENTS_WEBHOOK_KEY="synthetic",
        DODO_PAYMENTS_ENVIRONMENT="live_mode",
        dodo_business_id="synthetic",
        public_app_url="https://pursuit.example.com",
    )
    monkeypatch.setattr(payment_provider, "get_settings", lambda: settings)
    assert payment_provider.portal_ready() and not payment_provider.checkout_ready()
    settings.billing_checkout_enabled = True
    assert payment_provider.checkout_ready()
