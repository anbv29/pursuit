"""Dodo's official SDK, fixed server-side catalog and verified hosted URLs."""

from urllib.parse import urlsplit

from dodopayments import DodoPayments

from app.core.config import get_settings
from app.core.errors import AppError
from app.services.plans import PLANS


def product_ids():
    s = get_settings()
    return {"single": s.dodo_single_product, "founder": s.dodo_founder_product, "team": s.dodo_team_product}


def configured():
    s = get_settings()
    return bool(s.dodo_api_key and s.dodo_webhook_key and s.dodo_business_id)


def client():
    s = get_settings()
    if not configured():
        raise AppError(
            "Payments are not configured yet. No payment or plan change was made.", "billing_unavailable"
        )
    return DodoPayments(
        bearer_token=s.dodo_api_key.get_secret_value(),
        webhook_key=s.dodo_webhook_key.get_secret_value(),
        environment=s.dodo_environment,
        timeout=20,
        max_retries=0,
    )


def hosted_url(value):
    url = urlsplit(value or "")
    if url.scheme != "https" or not url.hostname or not url.hostname.endswith(".dodopayments.com"):
        raise AppError("The payment provider returned an unexpected checkout URL.")
    if url.username or url.password or url.port not in (None, 443):
        raise AppError("The payment provider returned an invalid checkout URL.")
    return value


def verify_product(product, slug):
    spec, price = PLANS[slug], product.price
    recurring = spec["interval"] == "month"
    if (
        product.business_id != get_settings().dodo_business_id
        or product.product_id != product_ids()[slug]
        or product.is_recurring != recurring
        or price.currency != "USD"
        or price.price != spec["price_cents"]
        or getattr(price, "discount_bps", 0)
        or getattr(price, "discount", 0)
        or getattr(price, "pay_what_you_want", False)
        or getattr(price, "purchasing_power_parity", False)
        or product.pricing_mode is not None
    ):
        raise AppError("This billing product does not match the advertised plan. Ask the operator to fix it.")
    if recurring and (
        price.type != "recurring_price"
        or price.payment_frequency_count != 1
        or price.payment_frequency_interval != "Month"
        or (price.trial_period_days or 0) != 0
    ):
        raise AppError("Subscription products must bill monthly with no trial.")
    if not recurring and price.type != "one_time_price":
        raise AppError("Single Report must use a fixed one-time price.")
