"""Authenticated account security. Password confirmation never appears in audit events."""

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core.db import get_db, utcnow
from app.core.errors import Conflict, Unauthorized
from app.core.ratelimit import limiter
from app.core.security import SESSION_COOKIE, hash_password, verify_password
from app.models import AuthSession, Membership, User
from app.models.enums import Role
from app.services import audit

router = APIRouter(prefix="/api/account", tags=["account security"])


class PasswordChange(BaseModel):
    current_password: SecretStr = Field(min_length=1, max_length=200)
    new_password: SecretStr = Field(min_length=8, max_length=200)


class DeleteAccount(BaseModel):
    current_password: SecretStr = Field(min_length=1, max_length=200)
    confirmation: str = Field(pattern="^DELETE MY ACCOUNT$")


def reauthenticate(db: Session, user: User, password: SecretStr) -> None:
    limiter.check(f"account-security:{user.id}", limit=5, window_seconds=600)
    # Serialize password/deletion changes for a user; re-read to reject stale credentials.
    db.execute(select(User.id).where(User.id == user.id).with_for_update())
    db.refresh(user)
    if not verify_password(user.password_hash, password.get_secret_value()):
        raise Unauthorized("Your current password is incorrect.")


@router.post("/password", status_code=204)
def change_password(
    body: PasswordChange,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    reauthenticate(db, user, body.current_password)
    if body.current_password.get_secret_value() == body.new_password.get_secret_value():
        raise Conflict("Choose a different new password.")
    user.password_hash = hash_password(body.new_password.get_secret_value())
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked_at=utcnow()))
    audit.record(db, "auth.password_changed", actor_id=user.id)
    db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.delete("", status_code=204)
def delete_account(
    body: DeleteAccount, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    reauthenticate(db, user, body.current_password)
    owned = db.scalar(
        select(Membership.id)
        .where(
            Membership.user_id == user.id,
            Membership.role == Role.OWNER,
        )
        .limit(1)
    )
    if owned:
        raise Conflict("Export and delete your owned workspaces first. End any subscription before deletion.")
    # Shared workspace records stay with their workspace; actor FKs become NULL.
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.delete(user)
    db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
