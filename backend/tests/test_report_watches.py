import uuid
from datetime import timedelta

from sqlalchemy import select

from app.core.db import new_session
from app.models import ReportWatch
from app.services import fetcher, watch_worker


def enable(api, path):
    claims = api.get(path).json()["claims"]
    response = api.post(path, {"enabled": True, "claim_ids": [claims[0]["id"]]})
    assert response.status_code == 200, response.text
    return response.json()


def changed(monkeypatch, body="Pro costs $59 per month."):
    calls = []

    def fetch(url, **kwargs):
        assert kwargs["deadline"] > 0
        calls.append(url)
        return fetcher.Fetched(url, "Pricing", body, "changed")

    monkeypatch.setattr(fetcher, "fetch", fetch)
    return calls


def test_opt_in_and_get_never_fetch_and_routes_enforce_scope_and_csrf(api, watched, other, monkeypatch):
    ws, rid, path, _ = watched
    calls = changed(monkeypatch)
    off = api.get(path).json()
    assert off["enabled"] is False and off["alerts"] == [] and off["last_checked_at"] is None
    assert watch_worker.run_due() is False
    assert api.post(path + "/check").status_code == 400
    assert other.get(path).status_code == 404
    assert other.post(path, {"enabled": True, "claim_ids": []}).status_code == 404
    foreign_ws = other.workspace()
    assert other.get(f"/api/workspaces/{foreign_ws}/reports/{rid}/watch").status_code == 404
    assert api.get(f"/api/workspaces/{foreign_ws}/watch-alerts").status_code == 404
    assert api.get(f"/api/workspaces/{ws}/watch-alerts?report_id={uuid.uuid4()}").status_code == 404
    assert api.client.post(path, json={"enabled": False}).status_code == 403
    enabled = enable(api, path)
    assert enabled["enabled"] and enabled["queued"] and not enabled["checking"]
    assert calls == []


def test_changed_alerts_are_deduplicated_and_acknowledgement_retains_baseline(api, watched, monkeypatch):
    ws, _, path, _ = watched
    enable(api, path)
    calls = changed(monkeypatch)
    assert watch_worker.run_due()
    assert len(calls) == 1
    status = api.get(path).json()
    assert status["last_checked_at"] and not status["overdue"]
    alert = status["alerts"][0]
    assert alert["kind"] == "changed" and alert["needs_review"]
    assert alert["previous_excerpt"] == "Pro costs $49 per month."
    assert alert["current_excerpt"] == "Pro costs $59 per month."
    assert alert["previous_retrieved_at"] == "2026-11-01T00:00:00Z"
    assert alert["current_retrieved_at"] and alert["previous_fingerprint"]
    ack = api.patch(f"/api/workspaces/{ws}/watch-alerts/{alert['id']}", {"acknowledged": True})
    assert ack.status_code == 200 and ack.json()["acknowledged_at"]
    assert api.post(path + "/check").json() == {"queued": True}
    assert watch_worker.run_due()
    again = api.get(path).json()["alerts"]
    assert len(again) == 1 and again[0]["acknowledged_at"]
    assert again[0]["previous_excerpt"] == "Pro costs $49 per month."
    with new_session() as db:
        assert (
            db.scalar(select(ReportWatch)).snapshots[0]["receipts"][0]["excerpt"] == alert["previous_excerpt"]
        )


def test_failures_retry_without_false_contradictions_or_repeat_alerts(api, watched, monkeypatch):
    _, _, path, _ = watched
    enable(api, path)

    def unavailable(*args, **kwargs):
        raise fetcher.FetchError("Source is unavailable")

    monkeypatch.setattr(fetcher, "fetch", unavailable)
    assert watch_worker.run_due()
    status = api.get(path).json()
    assert status["alerts"][0]["kind"] == "unverifiable"
    assert status["alerts"][0]["current_retrieved_at"] is None
    with new_session() as db:
        watch = db.scalar(select(ReportWatch))
        assert timedelta(hours=5) < watch.next_check_at - watch.last_checked_at < timedelta(hours=7)
    api.post(path + "/check")
    assert watch_worker.run_due()
    assert len(api.get(path).json()["alerts"]) == 1
    changed(monkeypatch, "Pro costs $49 per month.")
    api.post(path + "/check")
    assert watch_worker.run_due()
    with new_session() as db:
        watch = db.scalar(select(ReportWatch))
        assert watch.next_check_at - watch.last_checked_at == timedelta(days=7)
