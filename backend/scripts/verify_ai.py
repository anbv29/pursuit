"""Bounded credential/model smoke check; prints no credential or provider response body."""

import anthropic

from app.core.config import get_settings

settings = get_settings()
if not settings.ai_enabled:
    raise SystemExit("ANTHROPIC_API_KEY is still missing in the private backend environment.")
try:
    with anthropic.Anthropic(
        api_key=settings.anthropic_api_key.get_secret_value(), timeout=20, max_retries=0
    ) as client:
        response = client.messages.create(
            model=settings.research_model,
            max_tokens=16,
            messages=[{"role": "user", "content": "Reply with exactly READY."}],
        )
    ready = any(getattr(block, "text", "").strip() == "READY" for block in response.content)
    if not ready:
        raise SystemExit("The provider responded but the model smoke check was inconclusive.")
    print("Configured research model and API key verified with one bounded request.")
except anthropic.APIError as exc:
    raise SystemExit(f"AI verification failed ({type(exc).__name__}); private details suppressed.") from exc
