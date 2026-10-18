# ruff: noqa: F811
from types import SimpleNamespace

from app.services import report_chat
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401


def test_questions_persist_and_drop_fake_citations(api, ws, fake_ai, monkeypatch, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]

    class Client:
        messages = None

        def __init__(self, **kwargs):
            self.messages = self

        def parse(self, **kwargs):
            assert "saved report" in kwargs["system"]
            return SimpleNamespace(
                stop_reason="end_turn",
                parsed_output=report_chat.Answer(
                    answer="Ask clinics about their last claim.",
                    source_ids=["S1", "fake"],
                    limitations=["No customer outcomes yet."],
                ),
            )

    monkeypatch.setattr(report_chat.anthropic, "Anthropic", Client)
    path = f"/api/workspaces/{ws}/reports/{rid}/questions"
    row = api.post(path, {"question": "What should I do first?"})
    assert row.status_code == 201
    assert row.json()["payload"]["source_ids"] == ["S1"]
    assert api.get(path).json()[0]["payload"]["answer"].startswith("Ask clinics")
    assert other.get(path).status_code == 404
    assert api.post(path, {"question": ""}).status_code == 422
