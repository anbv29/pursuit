"""Trusted operator service. Intentionally has no public HTTP endpoint."""

from sqlalchemy import select

from app.core.errors import AppError, NotFound
from app.models import ComplimentaryAccess, Membership, User, Workspace
from app.models.enums import Role
from app.services import audit, complimentary


def grant(db, email, workspace_id, plan, reason):
    if plan not in ("founder", "team") or not 1 <= len(reason.strip()) <= 240:
        raise AppError("Choose a supported plan and a concise audit reason.")
    workspace = db.scalar(select(Workspace).where(Workspace.id == workspace_id).with_for_update())
    owner = db.scalar(
        select(User)
        .join(Membership)
        .where(
            Membership.workspace_id == workspace_id,
            Membership.role == Role.OWNER,
            User.email == email.strip().lower(),
        )
    )
    if not workspace or not owner:
        raise NotFound("The account does not own the specified workspace.")
    if workspace.is_demo:
        raise AppError("Complimentary access requires a company workspace.")
    access = db.scalar(select(ComplimentaryAccess).where(ComplimentaryAccess.workspace_id == workspace_id))
    if not access:
        access = ComplimentaryAccess(workspace_id=workspace_id, plan=plan, reason=reason.strip())
        db.add(access)
    access.plan, access.reason, access.revoked_at = plan, reason.strip(), None
    db.flush()
    complimentary.provision(db, workspace_id)
    audit.record(
        db,
        "billing.complimentary_granted",
        actor_id=None,
        workspace_id=workspace_id,
        target_type="complimentary_access",
        target_id=access.id,
        detail={"plan": plan, "reason": reason.strip(), "channel": "trusted_operator"},
    )
    db.commit()
    return access
