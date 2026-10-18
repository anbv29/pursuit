"""Conversation operations are bound to a locally approved action, never a user-supplied Fo ID."""

from app.adapters.fo.base import FoUnavailable
from app.adapters.fo.factory import get_adapter
from app.core.db import utcnow
from app.core.errors import AppError, Conflict, Forbidden
from app.models.enums import ActionStatus
from app.services import action_history, concierge, executor, instructions


def guard(db, exp, action, user):
    db.refresh(action, with_for_update=True)
    if action.requested_by != user.id:
        raise Forbidden("Only the account that started this task can contact Fo for it.")
    if not action.payload.get("coordination"):
        raise AppError("This is not an interview concierge task.")
    if action.status != ActionStatus.UNKNOWN or not action.provider_ref:
        raise Conflict("Only an unconfirmed task with a saved Fo conversation can be checked.")


def refresh(db, exp, action, user):
    guard(db, exp, action, user)
    try:
        result = get_adapter(action.mode, user_id=user.id).poll(action.provider_ref)
    except FoUnavailable as exc:
        action.error = str(exc)[:1000]
        action_history.remember(db, action, "check_failed", action.error)
        db.commit()
        raise AppError("Fo could not be checked. No new outreach was submitted.") from exc
    action.error = None
    executor._finish(db, action, exp, result)
    db.commit()
    return action


def reply(db, exp, action, user, message):
    guard(db, exp, action, user)
    if action.fo_state != "needs_input":
        raise Conflict("Fo has not requested clarification. Check its latest update first.")
    concierge.check_execution(db, exp, action)
    # Commit the human's approval before any outgoing request. No blind retries.
    action.status = ActionStatus.RUNNING
    action_history.remember(db, action, "reply_approved", message, user.id)
    db.commit()
    clarification = instructions.clean(message, 2000)
    instruction = (
        instructions.build(action.kind, action.target, action.payload)
        + "\nThis is a clarification for the existing task. Do not resend the initial invitation. "
        "Keep all original recipient, deadline and reminder limits. Do not expand the scope. "
        "Ask for a newly approved task if this answer conflicts with those boundaries.\n"
        + f"<<<PURSUIT_CONTENT>>>\n{clarification}\n<<<PURSUIT_CONTENT>>>"
    )
    try:
        adapter = get_adapter(action.mode, user_id=user.id)
        result = adapter.reply(instruction, action.provider_ref)
        executor._finish(db, action, exp, result)
        action.error = None
    except Exception:
        # Even a timeout can have sent the reply. Never invite an automatic resend.
        action.status = ActionStatus.UNKNOWN
        action.error = "The reply outcome is uncertain. Check Fo before submitting another reply."
        action.finished_at = utcnow()
        action_history.remember(db, action, "unknown", action.error)
    db.commit()
    return action
