import uuid

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError, Conflict, NotFound
from app.models import BillingAccount, FirstLook, Membership, User, Workspace
from app.models.enums import Role
from app.services import audit, entitlements


def create(db: Session, user: User, name: str, is_demo: bool = False) -> Workspace:
    ws = Workspace(name=name.strip(), is_demo=is_demo)
    db.add(ws)
    db.flush()
    db.add(Membership(workspace_id=ws.id, user_id=user.id, role=Role.OWNER))
    audit.record(db, "workspace.create", actor_id=user.id, workspace_id=ws.id, detail={"demo": is_demo})
    db.commit()
    return ws


def list_for_user(db: Session, user: User) -> list[tuple[Workspace, Role]]:
    rows = db.execute(
        select(Workspace, Membership.role)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .where(Membership.user_id == user.id)
        .order_by(Workspace.created_at)
    ).all()
    return [(ws, role) for ws, role in rows]


def members(db: Session, workspace_id: uuid.UUID) -> list[tuple[User, Role]]:
    rows = db.execute(
        select(User, Membership.role)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.workspace_id == workspace_id)
        .order_by(Membership.created_at)
    ).all()
    return [(u, r) for u, r in rows]


def add_member(db: Session, actor: User, workspace_id: uuid.UUID, email: str) -> User:
    """Add an existing Pursuit user. Invitations by email are out of scope for now."""
    user = db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
    if user is None:
        raise NotFound("No Pursuit account uses that email. Ask them to sign up first.")
    exists = db.scalar(
        select(Membership.id).where(Membership.workspace_id == workspace_id, Membership.user_id == user.id)
    )
    if exists:
        raise Conflict("That person is already a member.")
    db.execute(select(Workspace.id).where(Workspace.id == workspace_id).with_for_update())
    used = db.scalar(select(func.count(Membership.id)).where(Membership.workspace_id == workspace_id))
    if used >= entitlements.PLANS[entitlements.plan(db, workspace_id)]["seats"]:
        raise AppError("The workspace member safety limit is 25 accounts.")
    db.add(Membership(workspace_id=workspace_id, user_id=user.id, role=Role.MEMBER))
    audit.record(db, "workspace.member_add", actor_id=actor.id, workspace_id=workspace_id, target_id=user.id)
    db.commit()
    return user


def delete(db: Session, actor: User, ws: Workspace) -> None:
    """Hard delete; FK cascades remove all workspace data (data-deletion requirement)."""
    account = db.get(BillingAccount, ws.id)
    if (
        account
        and account.subscription_id
        and account.status in ("active", "past_due", "on_hold", "paused", "pending")
    ):
        raise AppError(
            "Cancel the subscription and wait for it to end before deleting this workspace. "
            "Manage any historical subscription directly with its provider."
        )
    audit.record(db, "workspace.delete", actor_id=actor.id, detail={"workspace_id": str(ws.id)})
    # Keep only the account-level usage marker, not deleted project content.
    db.execute(
        update(FirstLook)
        .where(FirstLook.workspace_id == ws.id)
        .values(result=None, company_url="", audience="", error=None)
    )
    db.delete(ws)
    db.commit()


def remove_member(db, actor, workspace_id, user_id):
    membership = db.scalar(
        select(Membership).where(Membership.workspace_id == workspace_id, Membership.user_id == user_id)
    )
    if membership is None:
        raise NotFound("Member not found.")
    if membership.role == Role.OWNER:
        raise AppError("The workspace owner cannot be removed.")
    db.delete(membership)
    audit.record(
        db, "workspace.member_remove", actor_id=actor.id, workspace_id=workspace_id, target_id=user_id
    )
    db.commit()
