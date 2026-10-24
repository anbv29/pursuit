"""Read-only inference retries stay bounded and never disclose raw provider errors."""

import json
from types import SimpleNamespace

import httpx
import pytest
from pydantic import SecretStr

from app.services import free_research
from app.services.provider_failures import ProviderFailure, classify

pytestmark = pytest.mark.no_database


@pytest.fixture(autouse=True)
def no_retry_delay(monkeypatch):
    monkeypatch.setattr(free_research.time, "sleep", lambda _: None)


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


@pytest.mark.parametrize("failure", [httpx.ReadTimeout, httpx.ConnectError, httpx.RemoteProtocolError])
@pytest.mark.parametrize("recover", [True, False])
def test_network_failure_has_one_bounded_retry(monkeypatch, failure, recover, caplog):
    client = httpx.Client
    calls = []

    def handler(request):
        calls.append(json.loads(request.content))
        if len(calls) == 1 or not recover:
            raise failure("private-network-details", request=request)
        return httpx.Response(200, json=GOOD)

    monkeypatch.setattr(
        free_research.httpx, "Client",
        lambda **kwargs: client(transport=httpx.MockTransport(handler), **kwargs),
    )
    if recover:
        assert free_research._request(PAYLOAD, settings()) == '{"answer":"READY"}'
    else:
        with pytest.raises(ProviderFailure):
            free_research._request(PAYLOAD, settings())
    assert calls == [PAYLOAD, PAYLOAD]
    assert "private-network-details" not in caplog.text


def test_error_inside_success_status_respects_quota(monkeypatch):
    calls = transport(monkeypatch, [(200, {"error": {"code": 429, "message": "quota"}})])
    with pytest.raises(ProviderFailure) as caught:
        free_research._request(PAYLOAD, settings())
    assert caught.value.category == "rate_limit"
    assert len(calls) == 1


def test_error_inside_success_status_recovers_server_failure(monkeypatch):
    calls = transport(monkeypatch, [(200, {"error": {"code": 503}}), (200, GOOD)])
    assert free_research._request(PAYLOAD, settings()) == '{"answer":"READY"}'
    assert len(calls) == 2


@pytest.mark.parametrize("content", [None, "", "   ", [], {}])
def test_missing_content_is_never_accepted_as_a_result(monkeypatch, content):
    from app.services.provider_failures import PreviewError

    body = {"choices": [{"finish_reason": "stop", "message": {"content": content}}]}
    calls = transport(monkeypatch, [(200, body)])
    with pytest.raises(PreviewError):
        free_research._request(PAYLOAD, settings())
    assert len(calls) == 1


@pytest.mark.parametrize("reason", ["length", "content_filter", "error", None])
def test_partial_or_filtered_output_is_never_saved_as_complete(monkeypatch, reason):
    from app.services.provider_failures import PreviewError

    body = {"choices": [{"finish_reason": reason, "message": {"content": "partial"}}]}
    calls = transport(monkeypatch, [(200, body)])
    with pytest.raises(PreviewError, match="Incomplete"):
        free_research._request(PAYLOAD, settings())
    assert len(calls) == 1


def test_oversized_response_is_rejected_without_retries(monkeypatch):
    from app.services.provider_failures import PreviewError

    calls = transport(monkeypatch, [(200, {"private": "x" * 100_000})])
    with pytest.raises(PreviewError, match="response limit"):
        free_research._request(PAYLOAD, settings())
    assert len(calls) == 1
