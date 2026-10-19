from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import utcnow
from app.core.errors import Conflict, Unauthorized
from app.core.security import hash_password, hash_token, new_token, verify_password
from app.models import AuthSession, User
from app.services import audit


@dataclass
class IssuedSession:
    token: str
    csrf_token: str
    session: AuthSession


def register(db: Session, email: str, name: str, password: str) -> User:
    email = email.strip().lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise Conflict("An account with this email already exists.")
    user = User(email=email, name=name.strip(), password_hash=hash_password(password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise Conflict("An account with this email already exists.") from exc
    audit.record(db, "auth.register", actor_id=user.id, target_type="user", target_id=user.id)
    db.commit()
    return user


def login(db: Session, email: str, password: str) -> IssuedSession:
    # Serialize session issuance with password changes/account deletion. A login
    # must not issue a new session using a hash read before a password rotation.
    user = db.scalar(
        select(User)
        .where(func.lower(User.email) == email.strip().lower())
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if not verify_password(user.password_hash if user else None, password) or not user or not user.is_active:
        raise Unauthorized("Invalid email or password.")
    token, csrf = new_token(), new_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        csrf_token=csrf,
        expires_at=utcnow() + timedelta(hours=get_settings().session_ttl_hours),
    )
    db.add(session)
    audit.record(db, "auth.login", actor_id=user.id, target_type="user", target_id=user.id)
    db.commit()
    return IssuedSession(token=token, csrf_token=csrf, session=session)


def resolve(db: Session, token: str | None) -> AuthSession | None:
    if not token:
        return None
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if not session or session.revoked_at or session.expires_at <= utcnow() or not session.user.is_active:
        return None
    return session


def logout(db: Session, session: AuthSession) -> None:
    session.revoked_at = utcnow()
    audit.record(db, "auth.logout", actor_id=session.user_id)
    db.commit()
