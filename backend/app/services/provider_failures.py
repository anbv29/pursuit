"""Classify bounded provider failures without logging prompts, keys or raw bodies."""

import json


class PreviewError(Exception):
    """Safe internal transport error; provider response bodies must not reach clients."""


class ProviderFailure(PreviewError):
    def __init__(self, status, category, retryable=False):
        super().__init__(f"Provider HTTP {status}")
        self.status = status
        self.category = category
        self.retryable = retryable


def classify(status, raw=b""):
    try:
        error = json.loads(raw).get("error", {})
        message = str(error.get("message", "")).casefold() if isinstance(error, dict) else ""
    except (ValueError, AttributeError, TypeError):
        message = ""
    if status in (401, 403):
        return ProviderFailure(status, "authentication")
    if status == 402:
        return ProviderFailure(status, "account_limit")
    if status == 429:
        return ProviderFailure(status, "rate_limit")
    if status in (408, 500, 502, 503, 504):
        return ProviderFailure(status, "upstream_temporary", True)
    # A wrapped upstream rejection can be intermittent even though its outer HTTP
    # status is 400. Retry it ONCE; ordinary invalid requests never get retried.
    if status == 400 and message.strip() == "provider returned error":
        return ProviderFailure(status, "upstream_rejection", True)
    return ProviderFailure(status, "request_rejected")
