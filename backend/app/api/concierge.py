import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_owner
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Experiment, User
from app.schemas.actions import ActionOut
from app.schemas.concierge import ConciergeIn, MeetingResultIn, ReplyIn
from app.services import action_history, actions, concierge, concierge_results, fo_conversation

router = APIRouter(
    prefix="/api/workspaces/{workspace_id}/experiments/{experiment_id}",
    tags=["interview concierge"],
    dependencies=[Depends(workspace_owner)],
)


@router.post("/concierge", response_model=list[ActionOut], status_code=201)
def request(
    body: ConciergeIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"concierge:{user.id}", limit=10, window_seconds=3600)
    return concierge.request(db, exp, user, body)


@router.get("/actions/{action_id}/conversation")
def history(action_id: uuid.UUID, exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    action = actions.get(db, exp, action_id)
    return [
        {
            "id": str(r.id),
            "state": r.state,
            "summary": r.summary,
            "actor_id": str(r.actor_id) if r.actor_id else None,
            "created_at": r.created_at,
        }
        for r in action_history.list_updates(db, action)
    ]


@router.post("/actions/{action_id}/check", response_model=ActionOut)
def check(
    action_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-check:{user.id}", limit=10, window_seconds=600)
    return fo_conversation.refresh(db, exp, actions.get(db, exp, action_id), user)


@router.post("/actions/{action_id}/reply", response_model=ActionOut)
def reply(
    action_id: uuid.UUID,
    body: ReplyIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-reply:{user.id}", limit=10, window_seconds=600)
    return fo_conversation.reply(db, exp, actions.get(db, exp, action_id), user, body.message)


@router.post("/actions/{action_id}/interview-result", response_model=ActionOut)
def result(
    action_id: uuid.UUID,
    body: MeetingResultIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return concierge_results.record(db, exp, actions.get(db, exp, action_id), user, body)
