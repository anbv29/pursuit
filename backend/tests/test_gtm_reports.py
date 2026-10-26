# ruff: noqa: F811
import json

from app.schemas.report import PartGTM
from app.services import report_research, reports
from tests.test_gtm_strategy import strategy
from tests.test_report_validate import sample
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401

SYNTHESIZE = report_research.synthesize


def test_gtm_generates_persists_and_refreshes_constraints(api, ws, fake_ai, monkeypatch, other):
    contexts = []

    def part(client, model, context, schema, instruction):
        payload = json.loads(context)
        if schema is PartGTM:
            contexts.append(payload)
            result = strategy()
            result["objective"] = payload["founder_inputs"]["goal"]
            return PartGTM(gtm_strategy=result)
        return schema.model_validate(sample().model_dump())

    monkeypatch.setattr(report_research, "_client", lambda: object())
    monkeypatch.setattr(report_research, "_synthesize_part", part)
    monkeypatch.setattr(report_research, "synthesize", SYNTHESIZE)
    body = dict(
        BODY,
        goal="Find two clinic pilot buyers in India.",
        geography="India",
        gtm_constraints={
            "monthly_budget": 0,
            "currency": "INR",
            "weekly_hours": 4,
            "horizon_days": 30,
            "available_assets": "An existing clinic network",
        },
        research_urls=["https://reference.example/study"],
    )
    response = api.post(f"/api/workspaces/{ws}/reports", body)
    assert response.status_code == 202
    path = f"/api/workspaces/{ws}/reports/{response.json()['id']}"
    report = api.get(path).json()
    assert report["status"] == "SUCCEEDED", report
    plan = report["content"]["gtm_strategy"]
    assert plan["objective"] == body["goal"]
    assert plan["channels"][0]["monthly_budget"] == 0
    assert plan["channels"][0]["weekly_hours"] == 4
    assert contexts[0]["founder_inputs"]["geography"] == "India"
    assert contexts[0]["validated_report"]["snapshot"]["key_facts"][0]["kind"] != "fact"
    assert report["inputs"]["research_urls"] == ["https://reference.example/study"]
    assert other.post(path + "/refresh", {"sections": ["gtm_strategy"]}).status_code == 404
    refresh = api.post(
        path + "/refresh",
        {
            "sections": ["gtm_strategy"],
            "gtm_constraints": {"monthly_budget": 100, "currency": "INR"},
            "research_urls": [],
        },
    )
    assert refresh.status_code == 202
    snapshot = api.get(path + "/versions").json()[0]["payload"]
    assert snapshot["inputs"]["gtm_constraints"]["monthly_budget"] == 0
    reports.run(response.json()["id"])
    refreshed = api.get(path).json()
    assert refreshed["status"] == "SUCCEEDED", refreshed
    assert refreshed["content"]["gtm_strategy"]["channels"][0]["monthly_budget"] == 100
    assert refreshed["inputs"]["research_urls"] == []
    assert len(contexts) == 2


def test_refresh_rekeys_singular_measurement_and_brief_citations(api, ws, fake_ai):
    from app.core.db import new_session
    from app.models import Report

    response = api.post(f"/api/workspaces/{ws}/reports", BODY)
    report_id = response.json()["id"]
    with new_session() as db:
        report = db.get(Report, report_id)
        report.content = dict(
            report.content,
            measurements=[{"source_id": "S1"}],
            decision_brief=[{"evidence": [{"source_id": "S1"}]}],
        )
        db.commit()
    path = f"/api/workspaces/{ws}/reports/{report_id}"
    assert api.post(path + "/refresh", {"sections": ["pricing"]}).status_code == 202
    with new_session() as db:
        saved = db.get(Report, report_id).checkpoint["base_content"]
        measurement_id = saved["measurements"][0]["source_id"]
        assert measurement_id.startswith("OLD-")
        assert saved["decision_brief"][0]["evidence"][0]["source_id"] == measurement_id


def test_repeated_refresh_replaces_old_namespaces_instead_of_extending_them(api, ws, fake_ai):
    from app.core.db import new_session
    from app.models import Report

    response = api.post(f"/api/workspaces/{ws}/reports", BODY)
    report_id = response.json()["id"]
    old_id = "OLD-" * 25 + "S1"
    with new_session() as db:
        report = db.get(Report, report_id)
        report.sources = [dict(report.sources[-1], id=old_id)]
        report.content = dict(report.content, measurements=[{"source_id": old_id}])
        db.commit()
    path = f"/api/workspaces/{ws}/reports/{report_id}"
    assert api.post(path + "/refresh", {"sections": ["pricing"]}).status_code == 202
    with new_session() as db:
        saved = db.get(Report, report_id).checkpoint
        source_id = saved["base_content"]["measurements"][0]["source_id"]
        assert len(source_id) < 80 and source_id == saved["base_sources"][0]["id"]


def test_worker_does_not_reintroduce_an_older_company_snapshot(api, ws, fake_ai, monkeypatch):
    quote = "The current plan costs $99 per month."

    def research(url, site_text, inputs, on_progress):
        return report_research.Research(
            "Current public pricing.",
            [
                {
                    "id": "S1",
                    "url": "https://acme.example/",
                    "excerpt": quote,
                    "title": "Current company page",
                    "via": "pursuit_fetch",
                }
            ],
        )

    def synthesize(url, site_text, inputs, found):
        assert len(found.sources) == 1
        assert found.sources[0]["excerpt"] == quote
        return sample()

    monkeypatch.setattr(report_research, "research", research)
    monkeypatch.setattr(report_research, "synthesize", synthesize)
    response = api.post(f"/api/workspaces/{ws}/reports", BODY)
    report = api.get(f"/api/workspaces/{ws}/reports/{response.json()['id']}").json()
    assert report["status"] == "SUCCEEDED", report
    assert len(report["sources"]) == 1
