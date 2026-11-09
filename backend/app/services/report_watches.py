from datetime import timedelta

from sqlalchemy import select

from app.core.db import utcnow
from app.core.errors import AppError, NotFound
from app.models import Report, ReportWatch, WatchAlert
from app.services.watch_claims import MAX_SOURCES, claims_for

WEEK = timedelta(days=7)
SCHEDULE_NOTE = (
    "Sources are checked weekly while the service is awake. Free hosting can sleep. "
    "Overdue checks resume when the service returns, or you can request a check. "
    "Checks use saved citations without AI calls."
)


def alert_out(alert, name):
    return dict(
        alert.payload,
        id=str(alert.id),
        report_id=str(alert.report_id),
        company_name=name,
        checked_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
    )


def alerts_for(db, workspace_id, report_id=None):
    query = (
        select(WatchAlert, Report.company_name)
        .join(Report, WatchAlert.report_id == Report.id)
        .where(Report.workspace_id == workspace_id)
    )
    if report_id:
        query = query.where(Report.id == report_id)
    return [
        alert_out(alert, name)
        for alert, name in db.execute(query.order_by(WatchAlert.created_at.desc(), WatchAlert.id).limit(100))
    ]


def status(db, report):
    watch = db.scalar(select(ReportWatch).where(ReportWatch.report_id == report.id))
    current = {claim["id"]: claim for claim in claims_for(report)}
    selected = {claim["id"]: claim for claim in watch.snapshots} if watch else {}
    public = []
    for claim_id, claim in (current | selected).items():
        old = selected.get(claim_id)
        now = current.get(claim_id)
        public.append(
            {key: claim[key] for key in ("id", "text", "source_ids", "section", "recommendation_refs")}
            | {
                "selected": old is not None,
                "obsolete": old is not None and (now is None or now["fingerprint"] != old["fingerprint"]),
            }
        )
    checking = bool(watch and watch.lease_until and watch.lease_until > utcnow())
    return {
        "enabled": bool(watch and watch.enabled),
        "checking": checking,
        "claim_ids": list(selected),
        "claims": public,
        "last_checked_at": watch.last_checked_at if watch else None,
        "next_check_at": watch.next_check_at if watch and watch.enabled else None,
        "overdue": bool(watch and watch.enabled and watch.next_check_at and watch.next_check_at <= utcnow()),
        "alerts": alerts_for(db, report.workspace_id, report.id),
        "schedule_note": SCHEDULE_NOTE,
    }


def configure(db, report, body):
    db.execute(select(Report.id).where(Report.id == report.id).with_for_update())
    db.refresh(report)
    watch = db.scalar(select(ReportWatch).where(ReportWatch.report_id == report.id).with_for_update())
    if watch is None:
        watch = ReportWatch(report_id=report.id, snapshots=[], generation=0, enabled=False)
        db.add(watch)
    if body.enabled:
        available = {claim["id"]: claim for claim in claims_for(report)}
        ids = list(dict.fromkeys(body.claim_ids))
        if report.status != "SUCCEEDED" or not ids or not set(ids) <= available.keys():
            raise AppError("Choose cited claims from a completed report.")
        previous = {claim["id"]: claim for claim in watch.snapshots}
        snapshots = [previous.get(cid, available[cid]) for cid in ids]
        if len({r["url"] for c in snapshots for r in c["receipts"]}) > MAX_SOURCES:
            raise AppError(f"Choose claims citing at most {MAX_SOURCES} distinct sources.")
        if watch.enabled and watch.snapshots == snapshots:
            db.commit()
            return status(db, report)
        watch.snapshots = snapshots
    watch.generation += 1
    watch.enabled = body.enabled
    watch.lease_token = watch.lease_until = None
    watch.next_check_at = utcnow() if body.enabled else None
    db.commit()
    return status(db, report)


def queue_check(db, report):
    watch = db.scalar(select(ReportWatch).where(ReportWatch.report_id == report.id).with_for_update())
    if watch is None or not watch.enabled:
        raise AppError("Enable this report's watch before requesting a check.")
    if not watch.lease_until or watch.lease_until <= utcnow():
        watch.next_check_at = utcnow()
    db.commit()


def acknowledge(db, workspace_id, alert_id, acknowledged):
    alert = db.scalar(
        select(WatchAlert)
        .join(Report, WatchAlert.report_id == Report.id)
        .where(WatchAlert.id == alert_id, Report.workspace_id == workspace_id)
        .with_for_update(of=WatchAlert)
    )
    if alert is None:
        raise NotFound("Watch alert not found.")
    alert.acknowledged_at = (alert.acknowledged_at or utcnow()) if acknowledged else None
    db.commit()
    return alert_out(alert, db.get(Report, alert.report_id).company_name)
