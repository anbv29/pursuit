import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member, workspace_owner
from app.core.config import get_settings
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Membership, Report, User
from app.schemas.fo_chat import FoChatIn, FoChatOut
from app.services import fo_chat, fo_context, fo_oauth

router = APIRouter(prefix="/api/workspaces/{workspace_id}/fo-chat", tags=["Fo assistant"])


@router.get("")
def history(
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    return {
        "mode": fo_chat.mode(m.workspace),
        "connected": fo_chat.service_ready(db, user.id),
        "reports": [
            {"id": str(r.id), "name": r.company_name}
            for r in db.scalars(
                select(Report)
                .where(Report.workspace_id == m.workspace_id, Report.status == "SUCCEEDED")
                .order_by(Report.created_at.desc())
                .limit(100)
            )
        ],
        "actions_disabled": settings.actions_disabled,
        "can_send": m.role.value == "owner",
        "daily_limit": 30,
        "turns": [FoChatOut.model_validate(r) for r in fo_chat.history(db, m.workspace_id, user.id)],
    }


class ConnectIn(BaseModel):
    report_id: uuid.UUID
    share_report: Literal[True]
    request_key: uuid.UUID


@router.post("/connect")
def connect(
    body: ConnectIn,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-connect:{user.id}", limit=5, window_seconds=600)
    context = fo_context.snapshot(db, m.workspace_id, body.report_id)
    return {
        "url": fo_oauth.start(
            db, user.id, m.workspace_id, {"report": context, "request_key": str(body.request_key)}
        )
    }


@router.post("/context", response_model=FoChatOut)
def share_context(
    body: ConnectIn,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-context:{user.id}", limit=5, window_seconds=600)
    context = fo_context.snapshot(db, m.workspace_id, body.report_id)
    return fo_context.share(db, m.workspace, user, context, str(body.request_key))


@router.post("", response_model=FoChatOut, status_code=201)
def prepare(
    body: FoChatIn,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-chat-draft:{user.id}", limit=30, window_seconds=600)
    return fo_chat.prepare(db, m.workspace, user, body)


@router.post("/{turn_id}/approve", response_model=FoChatOut)
def approve(
    turn_id: uuid.UUID,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-chat-send:{user.id}", limit=30, window_seconds=600)
    return fo_chat.approve(db, m.workspace, user, turn_id)


@router.post("/{turn_id}/check", response_model=FoChatOut)
def check(
    turn_id: uuid.UUID,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-chat-check:{user.id}", limit=20, window_seconds=600)
    return fo_chat.check(db, m.workspace, user, turn_id)


@router.post("/{turn_id}/close", response_model=FoChatOut)
def close(
    turn_id: uuid.UUID,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return fo_chat.close(db, m.workspace, user, turn_id)
