"""Keep source-rich inference requests within a conservative byte budget."""

import copy
import json

from app.services.provider_failures import PreviewError

MAX_REQUEST_BYTES = 60_000
DOCUMENT_FIELDS = {
    "excerpt",
    "company_site",
    "website",
    "website_text",
    "notes",
    "research",
    "research_notes",
}


def encoded_size(value):
    return len(json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def trim_documents(value, limit, key=""):
    if isinstance(value, dict):
        return {k: trim_documents(v, limit, k) for k, v in value.items()}
    if isinstance(value, list):
        return [trim_documents(v, limit, key) for v in value]
    if isinstance(value, str) and key in DOCUMENT_FIELDS:
        multiplier = 1 if key == "excerpt" else 3 if key in {"research", "research_notes", "notes"} else 2
        return value[: limit * multiplier]
    return value


def fit_payload(payload):
    if encoded_size(payload) <= MAX_REQUEST_BYTES:
        return payload
    original = copy.deepcopy(payload)
    for limit in (4000, 2000, 1000, 500):
        candidate = copy.deepcopy(original)
        for message in candidate.get("messages", []):
            if message.get("role") != "user" or not isinstance(message.get("content"), str):
                continue
            try:
                data = json.loads(message["content"])
            except ValueError:
                continue
            if not isinstance(data, dict):
                continue
            data = trim_documents(data, limit)
            data["context_truncated"] = True
            message["content"] = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        if encoded_size(candidate) <= MAX_REQUEST_BYTES:
            return candidate
    # Never cut JSON, drop source identities, alter instructions or silently remove
    # founder answers to squeeze through a provider boundary.
    raise PreviewError("Research context exceeds the safe provider request limit")
