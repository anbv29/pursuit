from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_owner
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Membership, User
from app.services import first_look

router = APIRouter(prefix="/api/workspaces/{workspace_id}/first-look", tags=["free first look"])


class FirstLookIn(BaseModel):
    company_url: HttpUrl = Field(max_length=2048)
    audience: str = Field(default="", max_length=300)
    description: str = Field(default="", max_length=1500)


@router.get("")
def status(
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return first_look.summary(db, m.workspace_id, user.id)


@router.post("")
def create(
    body: FirstLookIn,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"first-look:{user.id}", limit=5, window_seconds=3600)
    return first_look.run(db, m.workspace, user, body)


@router.post("/experiment")
def experiment(
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return first_look.to_experiment(db, m.workspace, user)
