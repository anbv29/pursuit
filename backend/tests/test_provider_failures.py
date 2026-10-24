"""Read-only inference retries stay bounded and never disclose raw provider errors."""

import json
from types import SimpleNamespace

import httpx
import pytest
from pydantic import SecretStr

from app.services import free_research
from app.services.provider_failures import ProviderFailure, classify

pytestmark = pytest.mark.no_database


def transport(monkeypatch, responses):
    calls = []
    client = httpx.Client

    def handler(request):
        calls.append(json.loads(request.content))
        status, body = responses[min(len(calls) - 1, len(responses) - 1)]
        return httpx.Response(status, json=body)

    monkeypatch.setattr(
        free_research.httpx,
        "Client",
        lambda **kwargs: client(
            transport=httpx.MockTransport(handler),
            **kwargs,
        ),
    )
    return calls


def settings():
    return SimpleNamespace(openrouter_api_key=SecretStr("synthetic-secret"), ai_timeout_seconds=2)


PAYLOAD = {
    "model": "dots-studio/dots-3-note-preview:free",
    "provider": {
        "max_price": {"prompt": 0, "completion": 0},
        "data_collection": "deny",
        "allow_fallbacks": False,
    },
}
GOOD = {"choices": [{"finish_reason": "stop", "message": {"content": '{"answer":"READY"}'}}]}
WRAPPED = {"error": {"message": "Provider returned error", "metadata": {"raw": "private-prompt"}}}


def test_wrapped_rejection_recovers_once_with_identical_free_payload(monkeypatch, caplog):
    calls = transport(monkeypatch, [(400, WRAPPED), (200, GOOD)])
    assert free_research._request(PAYLOAD, settings()) == '{"answer":"READY"}'
    assert calls == [PAYLOAD, PAYLOAD]
    assert "private-prompt" not in caplog.text
    assert "synthetic-secret" not in caplog.text
    assert "upstream_rejection" in caplog.text


@pytest.mark.parametrize(
    "status,message",
    [(400, "Invalid schema"), (401, "Invalid key"), (402, "Limit reached"), (429, "Rate limited")],
)
def test_permanent_or_quota_failures_are_not_retried(monkeypatch, status, message):
    calls = transport(monkeypatch, [(status, {"error": {"message": message}})])
    with pytest.raises(ProviderFailure) as caught:
        free_research._request(PAYLOAD, settings())
    assert caught.value.status == status and len(calls) == 1


def test_persistent_upstream_failure_stops_after_two_requests(monkeypatch):
    calls = transport(monkeypatch, [(400, WRAPPED)])
    with pytest.raises(ProviderFailure):
        free_research._request(PAYLOAD, settings())
    assert len(calls) == 2


def test_server_failure_recovers_without_changing_model(monkeypatch):
    calls = transport(monkeypatch, [(503, {"error": "unavailable"}), (200, GOOD)])
    assert free_research._request(PAYLOAD, settings()) == '{"answer":"READY"}'
    assert calls == [PAYLOAD, PAYLOAD]


def test_untrusted_error_details_are_not_in_exception_or_logs(monkeypatch, caplog):
    calls = transport(monkeypatch, [(400, {"error": {"message": "private-prompt" * 2000}})])
    with pytest.raises(ProviderFailure) as caught:
        free_research._request(PAYLOAD, settings())
    assert len(calls) == 1
    assert "private-prompt" not in str(caught.value) + caplog.text
    assert caught.value.category == "request_rejected"


def test_malformed_error_envelope_does_not_trigger_speculative_retry():
    assert not classify(400, b"not-json").retryable
    assert not classify(400, b'{"error":null}').retryable
