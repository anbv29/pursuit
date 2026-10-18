import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Membership, User
from app.schemas.experiments import ExperimentOut
from app.schemas.report import ReportIn, ReportListItem, ReportOut
from app.services import reports

router = APIRouter(prefix="/api/workspaces/{workspace_id}/reports", tags=["reports"])


@router.get("", response_model=list[ReportListItem])
def list_reports(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    return reports.list_for_workspace(db, m.workspace_id)


@router.post("", response_model=ReportOut, status_code=202)
def create_report(
    body: ReportIn,
    background: BackgroundTasks,
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"report:{user.id}", limit=10, window_seconds=3600)
    report = reports.create(db, m.workspace, user, body)
    background.add_task(reports.run, report.id)
    return report


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: uuid.UUID, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)
):
    return reports.get(db, m.workspace_id, report_id)


@router.post("/{report_id}/experiments/{index}", response_model=ExperimentOut, status_code=201)
def create_experiment(
    report_id: uuid.UUID,
    index: int,
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    report = reports.get(db, m.workspace_id, report_id)
    return reports.to_experiment(db, m.workspace, user, report, index)
