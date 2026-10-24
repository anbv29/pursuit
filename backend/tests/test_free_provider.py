import json
from types import SimpleNamespace

import pytest
from pydantic import BaseModel

from app.services import free_provider, free_research

pytestmark = pytest.mark.no_database


def test_transient_transport_failure_reaches_checkpoint_recovery(monkeypatch):
    from app.services.provider_failures import ProviderFailure

    monkeypatch.setattr(
        free_provider, "get_settings",
        lambda: SimpleNamespace(ai_enabled=True, free_research_model="dots-studio/dots-3-note-preview:free"),
    )

    def interrupted(*_):
        raise ProviderFailure(502, "upstream_connection", True)

    monkeypatch.setattr(free_research, "_request", interrupted)
    with pytest.raises(free_provider.APIConnectionError, match="Saved progress"):
        free_provider.Client().parse(system="Test", messages=[], output_format=Answer)


class Answer(BaseModel):
    answer: str


def test_transport_never_selects_paid_model_or_tools(monkeypatch):
    settings = SimpleNamespace(ai_enabled=True, free_research_model="minimax/minimax-m3.1-flash:free")
    monkeypatch.setattr(free_provider, "get_settings", lambda: settings)
    seen = []

    def request(payload, settings):
        seen.append(payload)
        return json.dumps({"answer": "Source-grounded answer"})

    monkeypatch.setattr(free_research, "_request", request)
    result = free_provider.Client().parse(system="Use sources", messages=[], output_format=Answer)
    assert result.parsed_output.answer == "Source-grounded answer"
    assert seen[0]["provider"]["max_price"] == {"prompt": 0, "completion": 0}
    assert seen[0]["provider"]["allow_fallbacks"] is False
    assert "tools" not in seen[0]


def test_incomplete_results_never_become_success(monkeypatch):
    monkeypatch.setattr(
        free_provider,
        "get_settings",
        lambda: SimpleNamespace(ai_enabled=True, free_research_model="google/test:free"),
    )
    monkeypatch.setattr(free_research, "_request", lambda *_: '{"wrong":true}')
    with pytest.raises(free_provider.APIError):
        free_provider.Client().parse(system="Test", messages=[], output_format=Answer)


def test_rate_limits_are_not_hidden_or_retried(monkeypatch):
    monkeypatch.setattr(
        free_provider,
        "get_settings",
        lambda: SimpleNamespace(ai_enabled=True, free_research_model="google/gemma-4-31b-it:free"),
    )
    calls = []

    def failed(*args):
        calls.append(1)
        raise free_research.PreviewError("Provider HTTP 429")

    monkeypatch.setattr(free_research, "_request", failed)
    with pytest.raises(free_provider.RateLimitError, match="busy"):
        free_provider.Client().parse(system="Test", messages=[], output_format=Answer)
    assert calls == [1]


def test_working_free_model_requests_native_schema_without_paid_fallback(monkeypatch):
    settings = SimpleNamespace(ai_enabled=True, free_research_model="dots-studio/dots-3-note-preview:free")
    monkeypatch.setattr(free_provider, "get_settings", lambda: settings)
    seen = []
    monkeypatch.setattr(free_research, "_request", lambda p, s: seen.append(p) or '{"answer":"READY"}')
    result = free_provider.Client().parse(system="Test", messages=[], output_format=Answer)
    assert result.parsed_output.answer == "READY"
    payload = seen[0]
    assert payload["response_format"]["type"] == "json_schema"
    assert payload["response_format"]["json_schema"]["schema"] == Answer.model_json_schema()
    assert payload["provider"]["data_collection"] == "deny"
    assert payload["provider"]["max_price"] == {"prompt": 0, "completion": 0}
    assert payload["provider"]["allow_fallbacks"] is False


def test_schema_echo_is_never_accepted_as_generated_content(monkeypatch):
    settings = SimpleNamespace(ai_enabled=True, free_research_model="dots-studio/dots-3-note-preview:free")
    monkeypatch.setattr(free_provider, "get_settings", lambda: settings)
    monkeypatch.setattr(free_research, "_request", lambda *_: json.dumps(Answer.model_json_schema()))
    with pytest.raises(free_provider.APIError):
        free_provider.Client().parse(system="Test", messages=[], output_format=Answer)


def test_preview_and_full_reports_share_verified_schema_transport():
    schema = free_provider.response_format(
        free_research.PreviewContent, "dots-studio/dots-3-note-preview:free"
    )
    assert schema["type"] == "json_schema"
    assert schema["json_schema"]["schema"] == free_research.PreviewContent.model_json_schema()
    assert free_provider.response_format(Answer, "google/gemma-4-31b-it:free") == {"type": "json_object"}
