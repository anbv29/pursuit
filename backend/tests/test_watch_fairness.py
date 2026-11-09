from contextlib import contextmanager
from threading import Event
from types import SimpleNamespace

import pytest

from app.services import report_worker, reports, watch_worker

pytestmark = pytest.mark.no_database


def test_busy_report_queue_still_checks_watches_between_report_jobs(monkeypatch):
    stop = Event()
    calls = []

    @contextmanager
    def session():
        yield SimpleNamespace(scalar=lambda query: "queued report")

    def run_report(report_id):
        calls.append("report")
        if calls.count("report") == 2:
            stop.set()

    monkeypatch.setattr(report_worker, "new_session", session)
    monkeypatch.setattr(reports, "run", run_report)
    monkeypatch.setattr(watch_worker, "run_due", lambda: calls.append("watch"))
    report_worker.work(stop)
    assert calls == ["watch", "report", "watch", "report"]
