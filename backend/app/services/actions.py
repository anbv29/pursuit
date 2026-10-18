"""External action requests: request -> human approval -> execution -> outcome.

Status semantics (never conflated):
  PENDING_APPROVAL  waiting for a human
  QUEUED            approved, not yet picked up
  RUNNING           submitted to / being handled by the provider
  SUCCEEDED         demo: simulated; live: confirmed by a human
  FAILED            provider error, refused, or confirmed failure
  UNKNOWN           provider says it finished (or asked a question) but nobody
                    has confirmed what actually happened
  CANCELLED / REJECTED
"""

import hashlib
import json
import uuid
from datetime import timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import AppError, Conflict, NotFound
from app.models import ActionRequest, Experiment, MessageVariant, Prospect, User, Workspace
from app.models.enums import ActionKind, ActionStatus
from app.schemas.actions import ActionIn
from app.services import use_cases
from app.services.experiments import log

ACTIVE = (ActionStatus.QUEUED, ActionStatus.RUNNING, ActionStatus.SUCCEEDED, ActionStatus.UNKNOWN)


def _key(exp: Experiment, body: ActionIn) -> str:
    if body.idempotency_key:
        raw = body.idempotency_key
    else:
        fingerprint = json.dumps(
            [body.kind.value, body.target.lower(), str(body.variant_id), body.payload], sort_keys=True
        )
        raw = hashlib.sha256(fingerprint.encode()).hexdigest()[:40]
    # Namespace by experiment so keys can never collide across tenants.
    return f"{exp.id.hex[:16]}-{raw}"[:80]


def get(db: Session, exp: Experiment, action_id: uuid.UUID) -> ActionRequest:
    action = db.scalar(
        select(ActionRequest).where(ActionRequest.id == action_id, ActionRequest.experiment_id == exp.id)
    )
    if action is None:
        raise NotFound("Action not found.")
    return action


def list_for_experiment(db: Session, exp: Experiment):
    return db.scalars(
        select(ActionRequest)
        .where(ActionRequest.experiment_id == exp.id)
        .order_by(ActionRequest.created_at.desc())
    ).all()


def request(
    db: Session, exp: Experiment, user: User, body: ActionIn, *, commit=True, coordination_allowed=False
) -> ActionRequest:
    if body.payload.get("coordination") and not coordination_allowed:
        raise AppError("Use the interview concierge to request bounded coordination.")
    if exp.archived_at:
        raise AppError("This experiment is archived.", code="archived")
    allowed = set(use_cases.template(exp.use_case)["actions"]) | {ActionKind.RESEARCH_TASK}
    if body.kind not in allowed:
        raise AppError(
            f"'{body.kind.value}' isn't available for this kind of experiment.", code="not_allowed"
        )
    for model, ref in ((Prospect, body.prospect_id), (MessageVariant, body.variant_id)):
        if ref and not db.scalar(select(model.id).where(model.id == ref, model.experiment_id == exp.id)):
            raise NotFound(f"{model.__name__} not found.")
    key = _key(exp, body)
    if db.scalar(select(ActionRequest.id).where(ActionRequest.idempotency_key == key)):
        raise Conflict("An identical action already exists for this experiment.", code="duplicate_action")
    ws = db.get(Workspace, exp.workspace_id)
    mode = "demo" if (ws and ws.is_demo) or get_settings().fo_mode == "demo" else "live"
    action = ActionRequest(
        workspace_id=exp.workspace_id,
        experiment_id=exp.id,
        kind=body.kind,
        mode=mode,
        target=body.target,
        payload=body.payload,
        prospect_id=body.prospect_id,
        variant_id=body.variant_id,
        idempotency_key=key,
        requested_by=user.id,
    )
    db.add(action)
    db.flush()
    log(db, exp, user, "action.request", action_id=str(action.id), kind=body.kind.value, mode=mode)
    if commit:
        db.commit()
    return action


def _check_budget(db: Session, workspace_id: uuid.UUID) -> None:
    since = utcnow() - timedelta(hours=24)
    used = db.scalar(
        select(func.count(ActionRequest.id)).where(
            ActionRequest.workspace_id == workspace_id,
            ActionRequest.status.in_(ACTIVE),
            ActionRequest.decided_at >= since,
        )
    )
    if (used or 0) >= get_settings().fo_daily_action_limit:
        raise AppError("Daily action limit reached for this workspace.", code="budget_exceeded")


def decide(db: Session, exp: Experiment, user: User, action_id: uuid.UUID, approve: bool, note: str = ""):
    action = get(db, exp, action_id)
    if approve and get_settings().actions_disabled:
        raise AppError("External actions are temporarily disabled by the operator.", code="actions_disabled")
    if approve:
        _check_budget(db, exp.workspace_id)
    new_status = ActionStatus.QUEUED if approve else ActionStatus.REJECTED
    # Atomic compare-and-set: two concurrent approvals can't both win.
    res = db.execute(
        update(ActionRequest)
        .where(ActionRequest.id == action.id, ActionRequest.status == ActionStatus.PENDING_APPROVAL)
        .values(status=new_status, decided_by=user.id, decided_at=utcnow())
    )
    if res.rowcount != 1:
        db.rollback()
        raise Conflict("This action has already been decided.", code="already_decided")
    log(db, exp, user, "action.approve" if approve else "action.reject", action_id=str(action.id), note=note)
    db.commit()
    db.refresh(action)
    return action


def cancel(db: Session, exp: Experiment, user: User, action_id: uuid.UUID) -> ActionRequest:
    action = get(db, exp, action_id)
    res = db.execute(
        update(ActionRequest)
        .where(
            ActionRequest.id == action.id,
            ActionRequest.status.in_([ActionStatus.PENDING_APPROVAL, ActionStatus.QUEUED]),
        )
        .values(status=ActionStatus.CANCELLED, finished_at=utcnow())
    )
    if res.rowcount != 1:
        db.rollback()
        raise Conflict("Only pending or queued actions can be cancelled.")
    log(db, exp, user, "action.cancel", action_id=str(action.id))
    db.commit()
    db.refresh(action)
    return action
