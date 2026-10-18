# ruff: noqa: F811
from datetime import timedelta

from app.core.db import new_session, utcnow
from app.models import Report
from app.services import reports
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401, F811


def test_expired_lease_resumes_research_without_fetching_again(api, ws, fake_ai, monkeypatch):
    report = api.post(f"/api/workspaces/{ws}/reports", BODY).json()
    rid = report["id"]
    with new_session() as db:
        row = db.get(Report, rid)
        row.status = "RUNNING"
        row.lease_until = utcnow() - timedelta(seconds=1)
        db.commit()

    def never(*args, **kwargs):
        raise AssertionError("Saved research must be reused")

    monkeypatch.setattr(reports.fetcher, "fetch", never)
    monkeypatch.setattr(reports.report_research, "research", never)
    reports.run(rid)
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "SUCCEEDED"


def test_cancelled_job_cannot_write_over_cancellation(api, ws, fake_ai, monkeypatch):
    with new_session() as db:
        row = Report(workspace_id=ws, company_url="https://example.com", inputs={})
        db.add(row)
        db.commit()
        rid = str(row.id)

    def cancel_during_call(*args, **kwargs):
        response = api.post(f"/api/workspaces/{ws}/reports/{rid}/cancel")
        assert response.status_code == 200
        return reports.report_research.Research("notes", [])

    monkeypatch.setattr(reports.report_research, "research", cancel_during_call)
    reports.run(rid)
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "CANCELLED"
    assert api.post(f"/api/workspaces/{ws}/reports/{rid}/retry").json()["status"] == "QUEUED"
