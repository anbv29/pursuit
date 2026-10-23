"""Request dependencies: authentication, CSRF, and workspace authorization."""

import uuid

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.errors import Forbidden, NotFound, Unauthorized
from app.core.security import CSRF_HEADER, SESSION_COOKIE, tokens_match
from app.models import AuthSession, Membership, User
from app.models.enums import Role
from app.services import auth

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def current_session(request: Request, db: Session = Depends(get_db)) -> AuthSession:
    session = auth.resolve(db, request.cookies.get(SESSION_COOKIE))
    if session is None:
        raise Unauthorized("Please sign in.")
    if request.method not in SAFE_METHODS and not tokens_match(
        request.headers.get(CSRF_HEADER), session.csrf_token
    ):
        raise Forbidden("Missing or invalid CSRF token.", code="csrf_failed")
    return session


def current_user(session: AuthSession = Depends(current_session)) -> User:
    return session.user


def workspace_member(
    workspace_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Membership:
    """Resolve the caller's membership. Non-members get 404 so IDs don't leak existence."""
    membership = db.scalar(
        select(Membership).where(Membership.workspace_id == workspace_id, Membership.user_id == user.id)
    )
    if membership is None:
        raise NotFound("Workspace not found.")
    return membership


def workspace_owner(membership: Membership = Depends(workspace_member)) -> Membership:
    if membership.role != Role.OWNER:
        raise Forbidden("Only workspace owners can do this.")
    return membership
