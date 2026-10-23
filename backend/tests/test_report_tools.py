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

    monkeypatch.setattr(report_chat.free_provider, "Client", Client)
    path = f"/api/workspaces/{ws}/reports/{rid}/questions"
    row = api.post(path, {"question": "What should I do first?"})
    assert row.status_code == 201
    assert row.json()["payload"]["source_ids"] == ["S1"]
    assert api.get(path).json()[0]["payload"]["answer"].startswith("Ask clinics")
    assert other.get(path).status_code == 404
    assert api.post(path, {"question": ""}).status_code == 422


def test_first_week_plan_is_idempotent_and_tasks_persist(api, ws, fake_ai, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}/plan"
    first = api.post(path).json()
    assert len(first) == 7
    assert api.post(path).json()[0]["id"] == first[0]["id"]
    task = first[2]
    assert len(task["payload"]["steps"]) == 5
    response = api.patch(path + f"/{task['id']}", {"done": True, "notes": "Prepared interview questions"})
    assert response.json()["payload"]["done"] is True
    assert api.get(path).json()[2]["payload"]["notes"] == "Prepared interview questions"
    assert other.get(path).status_code == 404


def test_refresh_preserves_snapshot_and_namespaces_old_sources(api, ws, fake_ai, other):
    from app.core.db import new_session
    from app.models import Report

    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}"
    response = api.post(path + "/refresh", {"correction": "Our price is $29", "sections": ["pricing"]})
    assert response.status_code == 202
    versions = api.get(path + "/versions").json()
    assert len(versions) == 1 and versions[0]["payload"]["note"] == "Our price is $29"
    assert versions[0]["payload"]["content"]["snapshot"]["name"] == "Acme"
    with new_session() as db:
        report = db.get(Report, rid)
        assert report.checkpoint["sections"] == ["pricing"]
        assert all(s["id"].startswith("OLD-") for s in report.checkpoint["base_sources"])
    assert other.get(path + "/versions").status_code == 404
    assert api.post(path + "/refresh", {"sections": ["made_up"]}).status_code == 400
