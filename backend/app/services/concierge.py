"""Prepare at most five individually approved, recipient-bound interview tasks."""

from sqlalchemy import select

from app.core.errors import AppError, Conflict, NotFound
from app.models import ActionRequest, Prospect, Workspace
from app.models.enums import ActionKind, ActionStatus
from app.schemas.actions import ActionIn
from app.services import actions


def check_execution(db, exp, action):
    from datetime import datetime

    from app.core.config import get_settings
    from app.core.db import utcnow
    from app.models import Membership
    from app.models.enums import Role

    if get_settings().actions_disabled or exp.archived_at:
        raise AppError("Coordination is disabled or this experiment is archived.")
    c = action.payload["coordination"]
    if datetime.fromisoformat(c["deadline"]) <= utcnow():
        raise AppError("Coordination deadline passed. Review a new task before sending anything.")
    owner = db.scalar(
        select(Membership).where(
            Membership.workspace_id == exp.workspace_id,
            Membership.user_id == action.requested_by,
            Membership.role == Role.OWNER,
        )
    )
    prospect = db.get(Prospect, action.prospect_id) if action.prospect_id else None
    if owner is None or prospect is None or prospect.experiment_id != exp.id:
        raise AppError("The task no longer has an authorized owner and prospect.")
    if prospect.status == "declined" or prospect.email != action.target:
        raise AppError("The prospect declined contact or their email changed. Review a new task.")


def request(db, exp, user, body):
    db.execute(select(Workspace.id).where(Workspace.id == exp.workspace_id).with_for_update())
    prospects = list(
        db.scalars(
            select(Prospect)
            .where(
                Prospect.id.in_(body.prospect_ids),
                Prospect.experiment_id == exp.id,
            )
            .with_for_update()
        )
    )
    if len(prospects) != len(body.prospect_ids):
        raise NotFound("One of the selected prospects is not in this experiment.")
    if any(not p.email or p.status == "declined" for p in prospects):
        raise AppError("Choose prospects with email addresses who have not declined contact.")
    existing = db.scalars(
        select(ActionRequest).where(
            ActionRequest.experiment_id == exp.id,
            ActionRequest.prospect_id.in_(body.prospect_ids),
            ActionRequest.status.in_([ActionStatus.PENDING_APPROVAL, *actions.ACTIVE]),
        )
    )
    if any(a.payload.get("coordination") for a in existing):
        raise Conflict("A selected prospect already has an interview coordination task. Review it first.")
    coordination = body.model_dump(
        mode="json",
        include={
            "subject",
            "invitation",
            "timezone",
            "deadline",
            "max_followups",
        },
    )
    rows = []
    for p in prospects:
        rows.append(
            actions.request(
                db,
                exp,
                user,
                ActionIn(
                    kind=ActionKind.SCHEDULE_MEETING,
                    target=p.email,
                    prospect_id=p.id,
                    payload={
                        "title": body.title,
                        "window": body.window,
                        "duration_minutes": body.duration_minutes,
                        "coordination": coordination,
                    },
                ),
                commit=False,
                coordination_allowed=True,
            )
        )
    db.commit()
    return rows
