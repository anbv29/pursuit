"""Bounded free-provider smoke check; no credentials or raw response logging."""

from pydantic import BaseModel

from app.core.config import get_settings
from app.services.free_provider import APIError, Client


class Reply(BaseModel):
    answer: str


if not get_settings().ai_enabled:
    raise SystemExit("OPENROUTER_API_KEY is missing from the private backend environment.")
try:
    result = Client().parse(
        system="Return a short JSON answer.",
        messages=[{"role": "user", "content": "Reply with READY in the answer field."}],
        output_format=Reply,
        max_tokens=1000,
    )
    if result.parsed_output.answer.strip() != "READY":
        raise SystemExit("Provider replied but the smoke check was inconclusive.")
    print("Zero-priced research provider verified with one bounded request.")
except APIError:
    raise SystemExit("Free provider unavailable or rate-limited. No paid fallback used.") from None
