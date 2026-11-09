from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta
from threading import Event

from sqlalchemy import select

from app.core.db import new_session, utcnow
from app.models import Report, ReportWatch
from app.services import fetcher, watch_fetch, watch_worker
from tests.test_report_watches import changed, enable


def test_disable_fences_late_publish_and_preserves_baseline(api, watched, monkeypatch):
    _, _, path, _ = watched
    enable(api, path)
    changed(monkeypatch)
    claimed = watch_worker.claim_due()
    evidence = watch_fetch.collect_sources(claimed.snapshots)
    assert api.get(path).json()["checking"]
    assert api.post(path, {"enabled": False}).status_code == 200
    assert watch_worker.publish(claimed, evidence) is False
    status = api.get(path).json()
    assert not status["enabled"] and not status["checking"] and not status["alerts"]
    assert status["last_checked_at"] is None and status["next_check_at"] is None
    assert status["claim_ids"]
    assert watch_worker.run_due() is False


def test_concurrent_claims_and_expired_lease_recovery_fence_old_worker(api, watched, monkeypatch):
    _, _, path, _ = watched
    enable(api, path)
    changed(monkeypatch)
    with ThreadPoolExecutor(max_workers=2) as pool:
        claims = list(pool.map(lambda _: watch_worker.claim_due(), range(2)))
    assert sum(claim is not None for claim in claims) == 1
    old = next(claim for claim in claims if claim)
    with new_session() as db:
        watch = db.get(ReportWatch, old.id)
        watch.lease_until = utcnow() - timedelta(seconds=1)
        db.commit()
    recovered = watch_worker.claim_due()
    assert recovered.lease_token != old.lease_token
    evidence = watch_fetch.collect_sources(recovered.snapshots)
    assert watch_worker.publish(old, evidence) is False
    assert watch_worker.publish(recovered, evidence)
    assert watch_worker.publish(recovered, evidence) is False
    assert len(api.get(path).json()["alerts"]) == 1


def test_global_lock_bounds_one_fetch_job_across_workers(api, watched, monkeypatch):
    _, _, path, _ = watched
    enable(api, path)
    entered, release = Event(), Event()

    def slow_fetch(url, **kwargs):
        entered.set()
        assert release.wait(5)
        return fetcher.Fetched(url, "", "Pro costs $59 per month.", "new")

    monkeypatch.setattr(fetcher, "fetch", slow_fetch)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(watch_worker.run_due)
        try:
            assert entered.wait(5)
            assert pool.submit(watch_worker.run_due).result(timeout=5) is False
        finally:
            release.set()
        assert first.result(timeout=5)


def test_report_refresh_never_rebinds_sources_and_requires_explicit_baseline_reset(api, watched, monkeypatch):
    _, rid, path, _ = watched
    config = enable(api, path)
    changed(monkeypatch)
    claimed = watch_worker.claim_due()
    evidence = watch_fetch.collect_sources(claimed.snapshots)
    with new_session() as db:
        report = db.get(Report, rid)
        report.sources = [dict(source, url="https://new.example/pricing") for source in report.sources]
        db.commit()
    status = api.get(path).json()
    assert status["claims"][0]["obsolete"]
    body = {"enabled": True, "claim_ids": config["claim_ids"]}
    assert api.post(path, body).status_code == 409
    assert watch_worker.publish(claimed, evidence)
    alert = api.get(path).json()["alerts"][0]
    assert alert["kind"] == "unverifiable" and alert["obsolete"]
    assert alert["source_url"] == "https://example.com/pricing"
    assert alert["current_url"] is None
    old_claim = watch_worker.claim_due()
    assert old_claim is None
    assert api.post(path, dict(body, reset_baseline=True)).status_code == 200
    assert not api.get(path).json()["claims"][0]["obsolete"]
    assert len(api.get(path).json()["alerts"]) == 1
    assert watch_worker.run_due()
    assert len(api.get(path).json()["alerts"]) == 2
    with new_session() as db:
        watch = db.scalar(select(ReportWatch))
        assert watch.snapshots[0]["receipts"][0]["url"] == "https://new.example/pricing"


def test_reconfiguring_claim_selection_fences_a_running_check(api, watched, monkeypatch):
    _, rid, path, _ = watched
    with new_session() as db:
        report = db.get(Report, rid)
        content = deepcopy(report.content)
        content["snapshot"]["observed_pricing"].append(dict(content["snapshot"]["observed_pricing"][0]))
        report.content = content
        db.commit()
    enable(api, path)
    changed(monkeypatch)
    claimed = watch_worker.claim_due()
    evidence = watch_fetch.collect_sources(claimed.snapshots)
    config = api.post(path, {"enabled": True, "claim_ids": ["snapshot.observed_pricing.1"]})
    assert config.status_code == 200
    assert watch_worker.publish(claimed, evidence) is False
    assert api.get(path).json()["alerts"] == []
    assert watch_worker.run_due()
    assert api.get(path).json()["alerts"][0]["claim_id"] == "snapshot.observed_pricing.1"
