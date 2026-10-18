import hashlib
import secrets
import uuid
from copy import deepcopy
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import workspace_owner
from app.api.report_tools import owned_report
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.core.errors import AppError, NotFound
from app.models import Membership
from app.models.sharing import ReportShare
from app.services import audit

router = APIRouter(tags=["Report sharing"])
PREFIX = "/api/workspaces/{workspace_id}/reports/{report_id}/shares"


class ShareIn(BaseModel):
    expires_days: int = Field(default=7, ge=1, le=30)


def metadata(row):
    return {
        "id": str(row.id),
        "created_at": row.created_at,
        "expires_at": row.expires_at,
        "revoked_at": row.revoked_at,
    }


@router.post(PREFIX, status_code=201)
def create(
    body: ShareIn,
    report=Depends(owned_report),
    owner: Membership = Depends(workspace_owner),
    db: Session = Depends(get_db),
):
    if report.status != "SUCCEEDED" or not report.content:
        raise AppError("Only finished reports can be shared.")
    token = secrets.token_urlsafe(32)
    snapshot = {
        "company_name": report.company_name,
        "company_url": report.company_url,
        "content": deepcopy(report.content),
        "sources": deepcopy(report.sources),
        "model": report.model,
        "finished_at": report.finished_at.isoformat() if report.finished_at else None,
    }
    row = ReportShare(
        report_id=report.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        snapshot=snapshot,
        created_by=owner.user_id,
        expires_at=utcnow() + timedelta(days=body.expires_days),
    )
    db.add(row)
    audit.record(
        db, "report.share", actor_id=owner.user_id, workspace_id=owner.workspace_id, target_id=report.id
    )
    db.commit()
    return metadata(row) | {"url": get_settings().public_app_url.rstrip("/") + f"/shared/{token}"}


@router.get(PREFIX)
def list_shares(
    report=Depends(owned_report), owner: Membership = Depends(workspace_owner), db: Session = Depends(get_db)
):
    return [
        metadata(row) for row in db.scalars(select(ReportShare).where(ReportShare.report_id == report.id))
    ]


@router.delete(PREFIX + "/{share_id}", status_code=204)
def revoke(
    share_id: uuid.UUID,
    report=Depends(owned_report),
    owner: Membership = Depends(workspace_owner),
    db: Session = Depends(get_db),
):
    row = db.scalar(select(ReportShare).where(ReportShare.id == share_id, ReportShare.report_id == report.id))
    if row is None:
        raise NotFound("Share not found.")
    row.revoked_at = utcnow()
    audit.record(
        db, "report.unshare", actor_id=owner.user_id, workspace_id=owner.workspace_id, target_id=report.id
    )
    db.commit()


@router.get("/api/shared-reports/{token}")
def read(token: str, db: Session = Depends(get_db)):
    if not 30 <= len(token) <= 100:
        raise NotFound("This share is unavailable.")
    row = db.scalar(
        select(ReportShare).where(
            ReportShare.token_hash == hashlib.sha256(token.encode()).hexdigest(),
            ReportShare.revoked_at.is_(None),
            ReportShare.expires_at > utcnow(),
        )
    )
    if row is None:
        raise NotFound("This share expired or was revoked.")
    return row.snapshot | {"expires_at": row.expires_at}
