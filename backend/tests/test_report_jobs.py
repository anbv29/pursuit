# ruff: noqa: F811
from datetime import timedelta

from app.core.db import new_session, utcnow
from app.models import Report
from app.services import reports
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401, F811


def make_retry_due(rid):
    with new_session() as db:
        row = db.get(Report, rid)
        row.lease_until = utcnow() - timedelta(seconds=1)
        db.commit()


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


def test_manual_retry_renews_only_missing_research_pass_budget(api, ws, fake_ai):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    with new_session() as db:
        row = db.get(Report, rid)
        row.status = "FAILED"
        row.checkpoint = {"investigations": {"passes_allocated": 3, "customers": {"notes": "saved"}}}
        db.commit()
    assert api.post(f"/api/workspaces/{ws}/reports/{rid}/retry").status_code == 200
    with new_session() as db:
        row = db.get(Report, rid)
        assert row.checkpoint["investigations"]["passes_allocated"] == 1
        assert row.checkpoint["investigations"]["customers"]["notes"] == "saved"


def test_transient_interruption_resumes_without_refetching_site(api, ws, fake_ai, monkeypatch):
    from app.services.free_provider import APIConnectionError

    original = reports.report_research.research

    def interrupted(*args, **kwargs):
        raise APIConnectionError("Temporary transport interruption")

    monkeypatch.setattr(reports.report_research, "research", interrupted)
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "QUEUED"

    def never_fetch(*_):
        raise AssertionError("Completed site checkpoint must be reused")

    monkeypatch.setattr(reports.fetcher, "fetch", never_fetch)
    monkeypatch.setattr(reports.report_research, "research", original)
    make_retry_due(rid)
    reports.run(rid)
    result = api.get(f"/api/workspaces/{ws}/reports/{rid}").json()
    assert result["status"] == "SUCCEEDED" and result["error"] is None


def test_repeated_transient_failures_stop_without_false_success(api, ws, fake_ai, monkeypatch):
    from app.services.free_provider import APIConnectionError

    def interrupted(*args, **kwargs):
        raise APIConnectionError("Temporary transport interruption")

    monkeypatch.setattr(reports.report_research, "research", interrupted)
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    reports.run(rid)
    with new_session() as db:
        row = db.get(Report, rid)
        assert row.attempts == 1
        assert row.lease_until > utcnow()
        assert row.lease_owner is None
    for _ in range(reports.MAX_ATTEMPTS - 1):
        make_retry_due(rid)
        reports.run(rid)
    result = api.get(f"/api/workspaces/{ws}/reports/{rid}").json()
    assert result["status"] == "FAILED" and result["content"] is None
    with new_session() as db:
        row = db.get(Report, rid)
        assert row.attempts == reports.MAX_ATTEMPTS and row.checkpoint["site"]
        assert row.finished_at is not None and row.lease_until is None


def test_time_budget_pause_resumes_automatically(api, ws, fake_ai, monkeypatch):
    original = reports.report_research.research

    def pause(*args, **kwargs):
        raise reports.report_research.ResearchPaused("Saved for continuation")

    monkeypatch.setattr(reports.report_research, "research", pause)
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    result = api.get(f"/api/workspaces/{ws}/reports/{rid}").json()
    assert result["status"] == "QUEUED" and result["error"] is None
    monkeypatch.setattr(reports.report_research, "research", original)
    make_retry_due(rid)
    reports.run(rid)
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "SUCCEEDED"


def test_worker_finishes_persisted_job_without_an_open_report_request(api, ws, fake_ai):
    import threading

    from app.services import report_worker

    with new_session() as db:
        row = Report(workspace_id=ws, company_url="https://example.com", inputs={})
        db.add(row)
        db.commit()
        rid = str(row.id)

    stop = threading.Event()
    done = threading.Event()

    from unittest.mock import patch

    original = reports.run

    def run_once(report_id):
        original(report_id)
        stop.set()
        done.set()

    with patch.object(reports, "run", run_once):
        worker = threading.Thread(target=report_worker.work, args=(stop,))
        worker.start()
        try:
            assert done.wait(15)
        finally:
            stop.set()
            worker.join(timeout=15)
    assert api.get(f"/api/workspaces/{ws}/reports/{rid}").json()["status"] == "SUCCEEDED"
