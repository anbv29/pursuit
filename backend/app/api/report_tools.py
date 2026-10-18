import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Membership, User
from app.services import prospect_discovery, report_chat, report_plan, report_versions, reports

router = APIRouter(prefix="/api/workspaces/{workspace_id}/reports/{report_id}", tags=["Report tools"])


def owned_report(
    report_id: uuid.UUID, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)
):
    return reports.get(db, m.workspace_id, report_id)


def entry_out(entry):
    return {"id": str(entry.id), "kind": entry.kind, "payload": entry.payload, "created_at": entry.created_at}


class Question(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


@router.get("/prospects")
def prospects(report=Depends(owned_report), db: Session = Depends(get_db)):
    return [entry_out(row) for row in prospect_discovery.list_candidates(db, report)]


@router.post("/prospects/discover")
def discover(report=Depends(owned_report), user: User = Depends(current_user), db: Session = Depends(get_db)):
    limiter.check(f"discover:{user.id}", limit=5, window_seconds=3600)
    return [entry_out(row) for row in prospect_discovery.discover(db, report, user)]


class Refresh(BaseModel):
    correction: str = Field(default="", max_length=3000)
    sections: list[str] = Field(min_length=1, max_length=16)


@router.get("/versions")
def versions(report=Depends(owned_report), db: Session = Depends(get_db)):
    return [entry_out(row) for row in report_versions.versions(db, report)]


@router.get("/versions/{version_id}/compare")
def compare(version_id: uuid.UUID, report=Depends(owned_report), db: Session = Depends(get_db)):
    return report_versions.compare(db, report, version_id)


@router.post("/refresh", status_code=202)
def refresh(
    body: Refresh,
    report=Depends(owned_report),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"report-refresh:{user.id}", limit=5, window_seconds=3600)
    row = report_versions.refresh(db, report, user, body.correction, body.sections)
    return {"id": str(row.id), "status": row.status}


@router.get("/questions")
def questions(report=Depends(owned_report), db: Session = Depends(get_db)):
    return [entry_out(row) for row in report_chat.history(db, report)]


@router.post("/questions", status_code=201)
def ask(
    body: Question,
    report=Depends(owned_report),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"report-ask:{user.id}", limit=30, window_seconds=3600)
    return entry_out(report_chat.answer(db, report, user, body.question))


class TaskUpdate(BaseModel):
    done: bool
    notes: str = Field(default="", max_length=3000)


@router.get("/plan")
def plan(report=Depends(owned_report), db: Session = Depends(get_db)):
    return [entry_out(row) for row in report_plan.list_tasks(db, report)]


@router.post("/plan")
def create_plan(
    report=Depends(owned_report), user: User = Depends(current_user), db: Session = Depends(get_db)
):
    return [entry_out(row) for row in report_plan.create(db, report, user)]


@router.patch("/plan/{task_id}")
def update_plan(
    task_id: uuid.UUID,
    body: TaskUpdate,
    report=Depends(owned_report),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return entry_out(report_plan.update_task(db, report, user, task_id, body.done, body.notes))
