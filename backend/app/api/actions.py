import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member, workspace_owner
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import ActionRequest, Experiment, Membership, User
from app.models.enums import ActionStatus
from app.schemas.actions import ActionIn, ActionOut, ConfirmIn, DecisionIn
from app.services import actions, delivery_tracking, executor

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["actions"])
EXP = "/experiments/{experiment_id}/actions"


class TrackEmail(BaseModel):
    provider_message_id: uuid.UUID


@router.post(EXP + "/{action_id}/tracking")
def track_email(
    action_id: uuid.UUID,
    body: TrackEmail,
    exp: Experiment = Depends(experiment_dep),
    owner: Membership = Depends(workspace_owner),
    db: Session = Depends(get_db),
):
    limiter.check(f"tracking:{owner.user_id}", limit=30, window_seconds=600)
    return delivery_tracking.sync(db, exp, actions.get(db, exp, action_id), str(body.provider_message_id))


@router.get("/approvals", response_model=list[ActionOut])
def pending_approvals(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    """Workspace-wide queue of actions waiting for a human decision."""
    return db.scalars(
        select(ActionRequest)
        .where(
            ActionRequest.workspace_id == m.workspace_id,
            ActionRequest.status.in_([ActionStatus.PENDING_APPROVAL, ActionStatus.UNKNOWN]),
        )
        .order_by(ActionRequest.created_at)
    ).all()


@router.get(EXP, response_model=list[ActionOut])
def list_actions(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return actions.list_for_experiment(db, exp)


@router.post(EXP, response_model=ActionOut, status_code=201)
def request_action(
    body: ActionIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"action-req:{user.id}", limit=60, window_seconds=3600)
    return actions.request(db, exp, user, body)


@router.post(EXP + "/{action_id}/decision", response_model=ActionOut)
def decide(
    action_id: uuid.UUID,
    body: DecisionIn,
    background: BackgroundTasks,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    action = actions.decide(db, exp, user, action_id, body.decision == "approve", body.note)
    if action.status == ActionStatus.QUEUED:
        background.add_task(executor.execute, action.id)
    return action


@router.post(EXP + "/{action_id}/cancel", response_model=ActionOut)
def cancel(
    action_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return actions.cancel(db, exp, user, action_id)


@router.post(EXP + "/{action_id}/confirm", response_model=ActionOut)
def confirm(
    action_id: uuid.UUID,
    body: ConfirmIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    action = actions.get(db, exp, action_id)
    return executor.confirm(db, exp, user, action, body.outcome == "succeeded", body.note)
