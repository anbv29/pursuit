"""Prepare at most five individually approved, recipient-bound interview tasks."""

from sqlalchemy import select

from app.core.errors import AppError, Conflict, NotFound
from app.models import ActionRequest, Prospect, Workspace
from app.models.enums import ActionKind, ActionStatus
from app.schemas.actions import ActionIn
from app.services import actions


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
            )
        )
    db.commit()
    return rows
