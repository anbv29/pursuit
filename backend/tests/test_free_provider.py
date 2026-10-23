import json
from types import SimpleNamespace

import pytest
from pydantic import BaseModel

from app.services import free_provider, free_research

pytestmark = pytest.mark.no_database


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
