import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Experiment, InterviewCapture, Membership, User
from app.schemas.founder_workflow import (
    AcceptHighlightIn,
    CaptureIn,
    CaptureOut,
    CaptureSummary,
    FocusOut,
    HighlightIn,
    HighlightOut,
    ReminderIn,
    ReminderOut,
    ReminderPatch,
)
from app.services import experiments, founder_focus, interview_capture

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["founder-workflow"])
capture_router = APIRouter(
    prefix="/api/workspaces/{workspace_id}/experiments/{experiment_id}/interview-captures",
    tags=["interview-capture"],
)


@router.get("/focus", response_model=FocusOut)
def focus(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    return founder_focus.focus(db, m)


@router.get("/reminders", response_model=list[ReminderOut])
def reminders(
    experiment_id: uuid.UUID | None = None,
    include_completed: bool = False,
    m: Membership = Depends(workspace_member),
    db: Session = Depends(get_db),
):
    if experiment_id is not None:
        experiments.get(db, m.workspace_id, experiment_id)
    return founder_focus.list_reminders(db, m.workspace_id, experiment_id, include_completed)


@router.post("/reminders", response_model=ReminderOut, status_code=201)
def create_reminder(
    body: ReminderIn,
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"reminder:{user.id}", limit=100, window_seconds=3600)
    return founder_focus.create_reminder(db, m.workspace_id, user, body)


@router.patch("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: uuid.UUID,
    body: ReminderPatch,
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return founder_focus.update_reminder(db, m.workspace_id, reminder_id, user, body)


@capture_router.get("", response_model=list[CaptureSummary])
def captures(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return db.execute(
        select(InterviewCapture.id, InterviewCapture.title, InterviewCapture.created_at)
        .where(InterviewCapture.experiment_id == exp.id)
        .order_by(InterviewCapture.created_at.desc(), InterviewCapture.id)
        .limit(100)
    ).all()


@capture_router.post("", response_model=CaptureOut, status_code=201)
def create_capture(
    body: CaptureIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"capture:{user.id}", limit=30, window_seconds=3600)
    return interview_capture.create(db, exp, user, body)


@capture_router.get("/{capture_id}", response_model=CaptureOut)
def capture(capture_id: uuid.UUID, exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return interview_capture.serialize(db, interview_capture.get_capture(db, exp, capture_id))


@capture_router.post("/{capture_id}/highlights", response_model=HighlightOut, status_code=201)
def highlight(
    capture_id: uuid.UUID,
    body: HighlightIn,
    exp: Experiment = Depends(experiment_dep),
    db: Session = Depends(get_db),
):
    return interview_capture.add_highlight(db, interview_capture.get_capture(db, exp, capture_id), body)


@capture_router.post("/{capture_id}/highlights/{highlight_id}/accept", response_model=HighlightOut)
def accept_highlight(
    capture_id: uuid.UUID,
    highlight_id: uuid.UUID,
    body: AcceptHighlightIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return interview_capture.accept(
        db,
        exp,
        user,
        interview_capture.get_capture(db, exp, capture_id),
        highlight_id,
        body,
    )
