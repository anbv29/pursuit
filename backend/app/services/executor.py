"""Executes approved actions through the Fo adapter and records honest states."""

import logging
import time
import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.adapters.fo.base import FoResult, FoSubmissionUnknown, FoUnavailable
from app.adapters.fo.factory import get_adapter
from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.core.errors import AppError, Conflict
from app.models import ActionRequest, Experiment, OutcomeEvent, User
from app.models.enums import ActionKind, ActionStatus, DataOrigin, OutcomeKind
from app.services import action_history, instructions
from app.services.experiments import log

logger = logging.getLogger("pursuit.executor")
MAX_POLL_ERRORS = 3


def _record_sent(db: Session, action: ActionRequest, origin: DataOrigin, user_id=None) -> None:
    if action.kind != ActionKind.SEND_EMAIL:
        return
    db.add(
        OutcomeEvent(
            experiment_id=action.experiment_id,
            kind=OutcomeKind.SENT,
            variant_id=action.variant_id,
            prospect_id=action.prospect_id,
            action_id=action.id,
            origin=origin,
            recorded_by=user_id,
            note="Recorded from action execution.",
        )
    )


def _finish(db: Session, action: ActionRequest, exp: Experiment, result: FoResult) -> None:
    action_history.remember(db, action, result.state, result.summary)
    action.result_summary = result.summary[:2000]
    action.provider_ref = result.conversation_ref or action.provider_ref
    if result.state == "failed":
        action.status = ActionStatus.FAILED
    elif result.state == "complete" and result.simulated:
        action.status = ActionStatus.SUCCEEDED
        _record_sent(db, action, DataOrigin.DEMO)
    else:
        # Live completion, a question from Fo, or timeout: a human must confirm.
        action.status = ActionStatus.UNKNOWN
    action.finished_at = utcnow()
    log(db, exp, None, "action.result", action_id=str(action.id), status=action.status.value)


def execute(action_id: uuid.UUID, poll_interval: float = 2.0) -> None:
    """Background entry point. Uses its own DB session."""
    db = new_session()
    try:
        claimed = db.execute(
            update(ActionRequest)
            .where(ActionRequest.id == action_id, ActionRequest.status == ActionStatus.QUEUED)
            .values(status=ActionStatus.RUNNING, started_at=utcnow(), attempts=ActionRequest.attempts + 1)
        )
        db.commit()
        if claimed.rowcount != 1:
            return  # someone else is running it, or it was cancelled
        action = db.scalar(select(ActionRequest).where(ActionRequest.id == action_id))
        if get_settings().actions_disabled:  # emergency stop also catches already-queued work
            action.status = ActionStatus.FAILED
            action.error = "Not executed: external actions were disabled by the operator."
            action.finished_at = utcnow()
            db.commit()
            return
        exp = db.get(Experiment, action.experiment_id)
        submitted = False
        try:
            if action.payload.get("coordination"):
                from app.services.concierge import check_execution

                check_execution(db, exp, action)
            adapter = get_adapter(action.mode, user_id=action.requested_by)
            text = instructions.build(action.kind, action.target, action.payload)
            # Submit exactly once: re-submitting a send could duplicate a real email.
            result = adapter.submit(text, action.idempotency_key)
            submitted = True
            action_history.progress(db, action, result)
            deadline = time.monotonic() + get_settings().fo_max_poll_seconds
            errors = 0
            while result.state == "working" and time.monotonic() < deadline:
                time.sleep(poll_interval)
                try:
                    result = adapter.poll(result.conversation_ref)
                    action_history.progress(db, action, result)
                except FoUnavailable:
                    errors += 1
                    if errors >= MAX_POLL_ERRORS:
                        raise
            if result.state == "working":
                result = FoResult(
                    state="needs_input",
                    summary="Fo did not finish in time; outcome unknown.",
                    conversation_ref=action.provider_ref,
                )
            _finish(db, action, exp, result)
        except FoUnavailable as exc:
            submitted = submitted or isinstance(exc, FoSubmissionUnknown)
            action.status = ActionStatus.UNKNOWN if submitted else ActionStatus.FAILED
            action.error = str(exc)[:1000]
            action.finished_at = utcnow()
            action_history.remember(db, action, "unknown" if submitted else "failed", action.error)
            log(db, exp, None, "action.result", action_id=str(action.id), status=action.status.value)
        except AppError as exc:
            action.status = ActionStatus.UNKNOWN if submitted else ActionStatus.FAILED
            action.error, action.finished_at = exc.message, utcnow()
            action_history.remember(db, action, "unknown" if submitted else "failed", exc.message)
        except Exception:
            logger.exception("Action %s crashed", action_id)
            action.status = ActionStatus.UNKNOWN if submitted else ActionStatus.FAILED
            action.error = "Internal error while executing the action."
            action.finished_at = utcnow()
        db.commit()
    finally:
        db.close()


def confirm(db: Session, exp: Experiment, user: User, action: ActionRequest, succeeded: bool, note: str):
    """A human states what actually happened to an UNKNOWN (live) action."""
    res = db.execute(
        update(ActionRequest)
        .where(ActionRequest.id == action.id, ActionRequest.status == ActionStatus.UNKNOWN)
        .values(status=ActionStatus.SUCCEEDED if succeeded else ActionStatus.FAILED)
    )
    if res.rowcount != 1:
        db.rollback()
        raise Conflict("Only actions with an unknown outcome can be confirmed.")
    db.refresh(action)
    if succeeded:
        _record_sent(db, action, DataOrigin.FO, user.id)
    action_history.remember(db, action, "confirmed" if succeeded else "confirmed_failed", note, user.id)
    log(db, exp, user, "action.confirm", action_id=str(action.id), succeeded=succeeded, note=note)
    db.commit()
    return action
