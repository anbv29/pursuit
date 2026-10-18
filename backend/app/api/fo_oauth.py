from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import AppError
from app.core.ratelimit import limiter
from app.models import Membership, User
from app.models.connection import FoAuthorization, FoConnection
from app.services import audit, fo_oauth

router = APIRouter(tags=["Fo connection"])


@router.post("/api/workspaces/{workspace_id}/fo/connect")
def connect(
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"fo-connect:{user.id}", limit=5, window_seconds=600)
    return {"url": fo_oauth.start(db, user.id, m.workspace_id)}


@router.get("/api/fo/oauth/callback")
def callback(
    code: str = Query(max_length=2000),
    state: str = Query(max_length=200),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    try:
        ws_id = fo_oauth.complete(db, user.id, code, state)
    except AppError:
        db.rollback()
        return RedirectResponse(
            get_settings().public_app_url.rstrip("/") + "/w?fo=reconnect", status_code=303
        )
    audit.record(db, "fo.connect", actor_id=user.id, workspace_id=ws_id)
    db.commit()
    return RedirectResponse(
        get_settings().public_app_url.rstrip("/") + f"/w/{ws_id}/settings?fo=connected", status_code=303
    )


@router.delete("/api/fo/connection", status_code=204)
def disconnect(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(FoConnection).where(FoConnection.user_id == user.id))
    db.execute(delete(FoAuthorization).where(FoAuthorization.user_id == user.id))
    audit.record(db, "fo.disconnect", actor_id=user.id)
    db.commit()
