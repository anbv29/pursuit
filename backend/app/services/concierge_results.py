from sqlalchemy import select

from app.core.db import utcnow
from app.core.errors import AppError, Conflict
from app.models import ActionUpdate, Interview, OutcomeEvent, Prospect
from app.models.enums import ActionStatus, DataOrigin, OutcomeKind
from app.services import action_history
from app.services.experiments import log


def record(db, exp, action, user, body):
    db.refresh(action, with_for_update=True)
    if not action.payload.get("coordination"):
        raise AppError("This is not an interview concierge task.")
    if action.status not in (ActionStatus.UNKNOWN, ActionStatus.SUCCEEDED):
        raise Conflict("Review Fo's result before confirming the interview outcome.")
    if db.scalar(
        select(ActionUpdate.id).where(
            ActionUpdate.action_id == action.id,
            ActionUpdate.state.in_(["booked", "declined", "no_response"]),
        )
    ):
        raise Conflict("This interview task already has a recorded outcome.")
    origin = DataOrigin.DEMO if action.mode == "demo" else DataOrigin.MANUAL
    if body.result == "booked":
        db.add(
            Interview(
                experiment_id=exp.id,
                prospect_id=action.prospect_id,
                scheduled_at=body.scheduled_at,
                status="planned",
                origin=origin,
                notes=f"Booking confirmed by a person for task {action.id}. {body.note}",
            )
        )
        db.add(
            OutcomeEvent(
                experiment_id=exp.id,
                prospect_id=action.prospect_id,
                action_id=action.id,
                kind=OutcomeKind.MEETING_BOOKED,
                origin=origin,
                recorded_by=user.id,
                note=body.note or "Interview booking manually confirmed.",
            )
        )
    prospect = db.get(Prospect, action.prospect_id) if action.prospect_id else None
    if prospect and origin != DataOrigin.DEMO and body.result in ("booked", "declined"):
        prospect.status = "scheduled" if body.result == "booked" else "declined"
    action.status = ActionStatus.SUCCEEDED if body.result == "booked" else ActionStatus.FAILED
    action.finished_at = utcnow()
    action_history.remember(db, action, body.result, body.note or body.result, user.id)
    log(
        db,
        exp,
        user,
        "interview.coordination_result",
        action_id=str(action.id),
        result=body.result,
        simulated=action.mode == "demo",
    )
    db.commit()
    return action
