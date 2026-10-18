from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member, workspace_owner
from app.core.db import get_db
from app.models import AuditEvent, Membership, User
from app.schemas.common import AuditOut, MemberIn, MemberOut, WorkspaceIn, WorkspaceOut, WorkspaceWithRole
from app.services import workspaces

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceWithRole])
def list_workspaces(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        WorkspaceWithRole(**WorkspaceOut.model_validate(ws).model_dump(), role=role.value)
        for ws, role in workspaces.list_for_user(db, user)
    ]


@router.post("", response_model=WorkspaceOut, status_code=201)
def create_workspace(body: WorkspaceIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ws = workspaces.create(db, user, body.name, is_demo=body.with_demo_data)
    if body.with_demo_data:
        from app.services.demo_seed import seed_workspace

        seed_workspace(db, ws, user)
    return ws


@router.get("/{workspace_id}", response_model=WorkspaceWithRole)
def get_workspace(m: Membership = Depends(workspace_member)):
    return WorkspaceWithRole(**WorkspaceOut.model_validate(m.workspace).model_dump(), role=m.role.value)


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    workspaces.delete(db, user, m.workspace)


@router.get("/{workspace_id}/members", response_model=list[MemberOut])
def list_members(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    return [
        MemberOut(user_id=u.id, name=u.name, email=u.email, role=r.value)
        for u, r in workspaces.members(db, m.workspace_id)
    ]


@router.post("/{workspace_id}/members", response_model=MemberOut, status_code=201)
def add_member(
    body: MemberIn,
    m: Membership = Depends(workspace_owner),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    added = workspaces.add_member(db, user, m.workspace_id, body.email)
    return MemberOut(user_id=added.id, name=added.name, email=added.email, role="member")


@router.get("/{workspace_id}/audit", response_model=list[AuditOut])
def audit_log(m: Membership = Depends(workspace_owner), db: Session = Depends(get_db)):
    return db.scalars(
        select(AuditEvent)
        .where(AuditEvent.workspace_id == m.workspace_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(200)
    ).all()
