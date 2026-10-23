import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(ORM):
    id: uuid.UUID
    email: str
    name: str


class SessionOut(BaseModel):
    user: UserOut
    csrf_token: str


class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    with_demo_data: bool = False


class WorkspaceOut(ORM):
    id: uuid.UUID
    name: str
    is_demo: bool
    created_at: datetime


class WorkspaceWithRole(WorkspaceOut):
    role: str


class MemberIn(BaseModel):
    email: EmailStr


class MemberOut(BaseModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: str


class AuditOut(ORM):
    id: uuid.UUID
    action: str
    actor_id: uuid.UUID | None
    target_type: str | None
    target_id: str | None
    detail: dict
    created_at: datetime
