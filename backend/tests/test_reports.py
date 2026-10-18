import pytest

from app.core.config import get_settings
from app.services import fetcher, report_research
from tests.test_report_validate import sample


@pytest.fixture
def ai_on(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-real")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def fake_ai(monkeypatch, ai_on):
    calls = {}

    def research(url, site_text, inputs, on_progress):
        on_progress("Researching…")
        calls["research"] = {"url": url, "site": site_text, "inputs": inputs}
        return report_research.Research(
            notes="notes",
            sources=[{"id": "S1", "url": "https://acme.example/pricing", "title": "P", "via": "web_fetch"}],
        )

    def synthesize(url, site_text, inputs, found):
        calls["sources"] = [s["id"] for s in found.sources]
        return sample()

    monkeypatch.setattr(report_research, "research", research)
    monkeypatch.setattr(report_research, "synthesize", synthesize)
    monkeypatch.setattr(
        fetcher,
        "fetch",
        lambda url: fetcher.Fetched(url=url, title="Acme", text="We automate claims.", sha256="x"),
    )
    return calls


@pytest.fixture
def ws(api):
    api.signup()
    return api.workspace()


BODY = {
    "company_url": "https://acme.example",
    "description": "Claims automation for clinics",
    "stage": "early_revenue",
}


def test_report_generates_end_to_end(api, ws, fake_ai):
    r = api.post(f"/api/workspaces/{ws}/reports", BODY)
    assert r.status_code == 202, r.text
    rid = r.json()["id"]
    rep = api.get(f"/api/workspaces/{ws}/reports/{rid}").json()  # background task ran
    assert rep["status"] == "SUCCEEDED", rep
    assert rep["company_name"] == "Acme"
    assert rep["model"] == get_settings().research_model
    assert [s["id"] for s in rep["sources"]] == ["S0", "S1"]  # site + research
    assert fake_ai["sources"] == ["S0", "S1"]
    assert fake_ai["research"]["inputs"]["description"] == "Claims automation for clinics"
    assert rep["content"]["validation"]["downgraded_facts"] == 2
    assert api.get(f"/api/workspaces/{ws}/reports").json()[0]["status"] == "SUCCEEDED"


def test_report_to_experiment_carries_sourced_evidence(api, ws, fake_ai):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    exp = api.post(f"/api/workspaces/{ws}/reports/{rid}/experiments/1")
    assert exp.status_code == 201, exp.text
    e = exp.json()
    assert e["use_case"] == "messaging" and e["criteria"][0]["target"] == 0.12
    ev = api.get(f"/api/workspaces/{ws}/experiments/{e['id']}/evidence").json()
    assert len(ev) == 1 and ev[0]["source"]["url"] == "https://acme.example/pricing"
    assert api.post(f"/api/workspaces/{ws}/reports/{rid}/experiments/99").status_code == 404


def test_report_fails_honestly_without_ai_key(api, ws):
    r = api.post(f"/api/workspaces/{ws}/reports", BODY)
    assert r.status_code == 400 and r.json()["error"]["code"] == "ai_disabled"


def test_research_error_is_reported_not_hidden(api, ws, fake_ai, monkeypatch):
    def boom(*a, **k):
        raise report_research.ResearchError("The research step was declined.")

    monkeypatch.setattr(report_research, "research", boom)
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    rep = api.get(f"/api/workspaces/{ws}/reports/{rid}").json()
    assert (
        rep["status"] == "FAILED"
        and rep["error"] == "The research step was declined."
        and rep["content"] is None
    )


def test_unreadable_site_still_researched_with_note(api, ws, fake_ai, monkeypatch):
    def blocked(url):
        raise fetcher.FetchError("The page returned HTTP 403.")

    monkeypatch.setattr(fetcher, "fetch", blocked)
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "SUCCEEDED"
    assert "403" in fake_ai["research"]["inputs"]["website_note"]


def test_report_input_validation(api, ws, ai_on):
    for bad in (
        {"company_url": "javascript:alert(1)"},
        {"company_url": "not a url"},
        {"company_url": "https://a.example", "stage": "unicorn"},
    ):
        assert api.post(f"/api/workspaces/{ws}/reports", bad).status_code == 422


def test_reports_are_workspace_isolated(api, ws, fake_ai, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    assert other.get(f"/api/workspaces/{ws}/reports/{rid}").status_code == 404
    assert other.get(f"/api/workspaces/{ws}/reports").status_code == 404
    own = other.workspace("Mine")
    assert other.get(f"/api/workspaces/{own}/reports/{rid}").status_code == 404
    assert other.post(f"/api/workspaces/{own}/reports/{rid}/experiments/0").status_code == 404


def test_stale_reports_recovered(api, ws, ai_on):
    from datetime import timedelta

    from app.core import db as dbmod
    from app.core.db import utcnow
    from app.models import Report
    from app.services.reports import recover_stale

    s = dbmod.new_session()
    r = Report(
        workspace_id=ws,
        company_url="https://x.example",
        status="RUNNING",
        created_at=utcnow() - timedelta(hours=1),
    )
    s.add(r)
    s.commit()
    assert recover_stale(s) == 1
    s.refresh(r)
    assert r.status == "FAILED" and "Interrupted" in r.error
    s.close()
