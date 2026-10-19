"""Retrieve only an approved endpoint's key and save it privately; never prints secrets."""

import argparse
from pathlib import Path

from dodopayments import APIError, DodoPayments
from dotenv import set_key

from app.core.config import get_settings

parser = argparse.ArgumentParser()
parser.add_argument("endpoint_id")
parser.add_argument("expected_url")
parser.add_argument(
    "--secret-file", type=Path, help="Private key copied from the verified dashboard endpoint"
)
args = parser.parse_args()
settings = get_settings()
if settings.dodo_environment != "live_mode" or not settings.dodo_api_key:
    raise SystemExit("This command requires an explicitly configured live merchant API key.")
try:
    if args.secret_file:
        secret = args.secret_file.read_text(encoding="utf-8").strip()
    else:
        with DodoPayments(
            bearer_token=settings.dodo_api_key.get_secret_value(),
            environment="live_mode",
            timeout=15,
            max_retries=0,
        ) as provider:
            endpoint = provider.webhooks.retrieve(args.endpoint_id)
            if endpoint.url != args.expected_url or endpoint.disabled:
                raise SystemExit("The endpoint is not the approved enabled URL; no credentials saved.")
            secret = provider.webhooks.retrieve_secret(args.endpoint_id).secret
    if not secret.startswith("whsec_") or "\n" in secret:
        raise SystemExit("Unexpected signing key format; no credentials saved.")
    path = Path(__file__).resolve().parents[1] / ".env"
    set_key(path, "DODO_PAYMENTS_WEBHOOK_KEY", secret)
    set_key(path, "DODO_WEBHOOK_ID", args.endpoint_id)
    if args.secret_file:
        args.secret_file.unlink()
    print("Approved webhook signing key saved privately; no merchant permissions expanded.")
except APIError as exc:
    raise SystemExit(
        f"Webhook setup request failed ({type(exc).__name__}); private details suppressed."
    ) from exc
