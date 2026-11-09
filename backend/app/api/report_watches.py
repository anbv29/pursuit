import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import workspace_member, workspace_owner
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Membership
from app.schemas.report_watch import AcknowledgeIn, WatchIn
from app.services import report_watches, reports

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["report watches"])


@router.get("/reports/{report_id}/watch")
def get_watch(report_id: uuid.UUID, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    return report_watches.status(db, reports.get(db, m.workspace_id, report_id))


@router.post("/reports/{report_id}/watch")
def configure_watch(
    report_id: uuid.UUID,
    body: WatchIn,
    m: Membership = Depends(workspace_owner),
    db: Session = Depends(get_db),
):
    limiter.check(f"watch-config:{m.user_id}", limit=30, window_seconds=3600)
    return report_watches.configure(db, reports.get(db, m.workspace_id, report_id), body)


@router.post("/reports/{report_id}/watch/check", status_code=202)
def check_watch(
    report_id: uuid.UUID, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)
):
    limiter.check(f"watch-check:{m.workspace_id}", limit=10, window_seconds=3600)
    report_watches.queue_check(db, reports.get(db, m.workspace_id, report_id))
    return {"queued": True}


@router.get("/watch-alerts")
def list_alerts(
    report_id: uuid.UUID | None = None,
    m: Membership = Depends(workspace_member),
    db: Session = Depends(get_db),
):
    if report_id:
        reports.get(db, m.workspace_id, report_id)
    return report_watches.alerts_for(db, m.workspace_id, report_id)


@router.patch("/watch-alerts/{alert_id}")
def acknowledge_alert(
    alert_id: uuid.UUID,
    body: AcknowledgeIn,
    m: Membership = Depends(workspace_member),
    db: Session = Depends(get_db),
):
    limiter.check(f"watch-ack:{m.user_id}", limit=120, window_seconds=3600)
    return report_watches.acknowledge(db, m.workspace_id, alert_id, body.acknowledged)
