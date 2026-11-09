import uuid
from datetime import timedelta

from sqlalchemy import or_, select, text
from sqlalchemy.dialects.postgresql import insert

from app.core.db import new_session, utcnow
from app.models import Report, ReportWatch, WatchAlert
from app.services.report_watches import WEEK
from app.services.watch_claims import claims_for, compare, fingerprint, normalize
from app.services.watch_fetch import bounded_collect

LEASE = timedelta(seconds=90)
RETRY = timedelta(hours=6)
WORKER_LOCK = 74820153


def claim_due():
    with new_session() as db:
        watch = db.scalar(
            select(ReportWatch)
            .where(
                ReportWatch.enabled.is_(True),
                ReportWatch.next_check_at <= utcnow(),
                or_(ReportWatch.lease_until.is_(None), ReportWatch.lease_until <= utcnow()),
            )
            .order_by(ReportWatch.next_check_at, ReportWatch.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if watch is None:
            return None
        watch.lease_token = uuid.uuid4().hex
        watch.lease_until = utcnow() + LEASE
        db.commit()
        return watch


def publish(claimed, results):
    with new_session() as db:
        report = db.scalar(select(Report).where(Report.id == claimed.report_id).with_for_update())
        watch = db.scalar(
            select(ReportWatch)
            .where(
                ReportWatch.id == claimed.id,
                ReportWatch.enabled.is_(True),
                ReportWatch.generation == claimed.generation,
                ReportWatch.lease_token == claimed.lease_token,
                ReportWatch.lease_until > utcnow(),
            )
            .with_for_update()
        )
        if watch is None:
            return False
        available = {c["id"]: c["fingerprint"] for c in claims_for(report)}
        checked_at = utcnow()
        retry = False
        for claim in watch.snapshots:
            obsolete = report.status != "SUCCEEDED" or available.get(claim["id"]) != claim["fingerprint"]
            for receipt in claim["receipts"]:
                current = results.get(receipt["url"])
                outcome = (
                    (
                        "unverifiable",
                        "The report's saved claim or source changed. Review this obsolete selection.",
                        "",
                    )
                    if obsolete
                    else compare(claim, receipt, current)
                )
                if outcome is None:
                    continue
                kind, reason, excerpt = outcome
                retry |= kind == "unverifiable" and not obsolete
                payload = {
                    "kind": kind,
                    "reason": reason,
                    "needs_review": True,
                    "claim_id": claim["id"],
                    "claim_text": claim["text"],
                    "section": claim["section"],
                    "recommendation_refs": claim["recommendation_refs"],
                    "source_url": receipt["url"],
                    "source_title": receipt["title"] or "",
                    "previous_excerpt": receipt["excerpt"],
                    "current_excerpt": excerpt,
                    "previous_retrieved_at": receipt["retrieved_at"],
                    "current_retrieved_at": checked_at.isoformat() if current and not obsolete else None,
                    "current_url": current.url if current and not obsolete else None,
                    "previous_fingerprint": fingerprint(receipt),
                    "current_fingerprint": fingerprint(normalize(excerpt)) if excerpt else None,
                    "selection_fingerprint": claim["fingerprint"],
                    "obsolete": obsolete,
                }
                key = fingerprint(
                    [
                        claim["fingerprint"],
                        receipt["url"],
                        kind,
                        "obsolete" if obsolete else normalize(excerpt),
                    ]
                )
                db.execute(
                    insert(WatchAlert)
                    .values(
                        id=uuid.uuid4(),
                        watch_id=watch.id,
                        report_id=report.id,
                        dedupe_key=key,
                        payload=payload,
                        created_at=checked_at,
                    )
                    .on_conflict_do_nothing(constraint="uq_watch_alert_receipt")
                )
        watch.last_checked_at = checked_at
        watch.next_check_at = checked_at + (RETRY if retry else WEEK)
        watch.lease_token = watch.lease_until = None
        db.commit()
        return True


def run_due():
    with new_session() as guard:
        if not guard.scalar(text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": WORKER_LOCK}):
            return False
        claimed = claim_due()
        if claimed is None:
            return False
        return publish(claimed, bounded_collect(claimed.snapshots))
