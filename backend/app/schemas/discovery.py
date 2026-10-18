import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.models.enums import DataOrigin, OutcomeKind
from app.schemas.common import ORM


class ProspectIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    company: str = Field(default="", max_length=160)
    role: str = Field(default="", max_length=160)
    email: EmailStr | None = None
    segment: str = Field(default="", max_length=120)
    source_url: HttpUrl | None = None
    context: str = Field(default="", max_length=4000)


class ProspectPatch(BaseModel):
    status: Literal["identified", "contacted", "replied", "scheduled", "interviewed", "declined"] | None = (
        None
    )
    context: str | None = Field(default=None, max_length=4000)
    segment: str | None = Field(default=None, max_length=120)


class ProspectOut(ORM):
    id: uuid.UUID
    name: str
    company: str
    role: str
    email: str | None
    segment: str
    source_url: str | None
    context: str
    status: str
    origin: DataOrigin
    created_at: datetime


class InterviewIn(BaseModel):
    prospect_id: uuid.UUID | None = None
    scheduled_at: datetime | None = None
    status: Literal["planned", "completed", "no_show"] = "planned"
    notes: str = Field(default="", max_length=20000)
    pain_points: list[str] = Field(default_factory=list, max_length=20)
    current_solution: str = Field(default="", max_length=2000)
    frequency: str = Field(default="", max_length=120)
    cost_of_problem: str = Field(default="", max_length=160)
    budget_owner: str = Field(default="", max_length=160)
    wtp_signal: Literal["none", "verbal", "commitment"] = "none"
    contradictions: str = Field(default="", max_length=4000)


class InterviewOut(ORM, InterviewIn):
    id: uuid.UUID
    origin: DataOrigin
    created_at: datetime


class VariantIn(BaseModel):
    label: str = Field(min_length=1, max_length=40)
    subject: str = Field(default="", max_length=200)
    body: str = Field(min_length=1, max_length=5000)
    angle: str = Field(default="", max_length=200)


class VariantOut(ORM, VariantIn):
    id: uuid.UUID
    created_at: datetime


class OutcomeIn(BaseModel):
    kind: OutcomeKind
    variant_id: uuid.UUID | None = None
    prospect_id: uuid.UUID | None = None
    value: float | None = Field(default=None, ge=0, le=10_000_000)
    note: str = Field(default="", max_length=2000)
    occurred_at: datetime | None = None


class OutcomeOut(ORM):
    id: uuid.UUID
    kind: OutcomeKind
    variant_id: uuid.UUID | None
    prospect_id: uuid.UUID | None
    action_id: uuid.UUID | None
    value: float | None
    note: str
    origin: DataOrigin
    occurred_at: datetime
