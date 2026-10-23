"""Authenticated feature availability without subscriptions or checkout."""

from fastapi import APIRouter, Depends

from app.api.deps import workspace_member
from app.models import Membership
from app.services import entitlements

router = APIRouter(tags=["access"])


@router.get("/api/workspaces/{workspace_id}/allowance")
def availability(m: Membership = Depends(workspace_member)):
    return entitlements.summary(None, m.workspace_id)
