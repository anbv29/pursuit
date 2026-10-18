"""Read-only merchant catalog verification. Never creates a checkout or prints credentials."""

import sys

from dodopayments import APIError, DodoPayments

from app.core.config import get_settings
from app.core.errors import AppError
from app.services.payment_provider import product_ids, verify_product


def main():
    settings = get_settings()
    if not settings.dodo_api_key or not settings.dodo_api_key.get_secret_value():
        print("Billing API key is missing.")
        return 1
    failed = False
    with DodoPayments(
        bearer_token=settings.dodo_api_key.get_secret_value(),
        environment=settings.dodo_environment,
        timeout=15,
        max_retries=0,
    ) as provider:
        for slug, product_id in product_ids().items():
            try:
                product = provider.products.retrieve(product_id)
                verify_product(product, slug)
                print(f"{slug}: PASS ({settings.dodo_environment}, USD {product.price.price / 100:.2f})")
            except APIError as exc:
                print(f"{slug}: provider request failed ({type(exc).__name__}); details suppressed.")
                failed = True
            except AppError:
                print(f"{slug}: product does not match the advertised plan.")
                failed = True
    print(
        "Webhook signing key configured:",
        bool(settings.dodo_webhook_key and settings.dodo_webhook_key.get_secret_value()),
    )
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
