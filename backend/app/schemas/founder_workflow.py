import uuid
from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field, field_validator

from app.models.enums import Stance
from app.schemas.common import ORM

Category = Literal["pain", "objection", "current_solution", "buying_signal", "other"]


class CaptureIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    transcript: str = Field(min_length=10, max_length=80000)

    @field_validator("title", "transcript")
    @classmethod
    def meaningful(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter some text.")
        return value


class HighlightIn(BaseModel):
    category: Category
    quote: str = Field(min_length=3, max_length=4000)
    start_offset: int = Field(ge=0)


class HighlightOut(ORM):
    id: uuid.UUID
    category: Category
    quote: str
    start_offset: int
    end_offset: int
    evidence_id: uuid.UUID | None


class CaptureOut(ORM):
    id: uuid.UUID
    title: str
    transcript: str
    created_at: datetime
    highlights: list[HighlightOut]


class CaptureSummary(ORM):
    id: uuid.UUID
    title: str
    created_at: datetime


class AcceptHighlightIn(BaseModel):
    claim: str = Field(min_length=3, max_length=4000)
    stance: Stance = Stance.NEUTRAL

    @field_validator("claim")
    @classmethod
    def meaningful(cls, value: str) -> str:
        if len(value.strip()) < 3:
            raise ValueError("Describe the finding in at least three characters.")
        return value.strip()


class ReminderIn(BaseModel):
    experiment_id: uuid.UUID
    title: str = Field(min_length=1, max_length=160)
    due_at: AwareDatetime

    @field_validator("title")
    @classmethod
    def meaningful(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Give the reminder a title.")
        return value.strip()


class ReminderPatch(BaseModel):
    due_at: AwareDatetime | None = None
    completed: bool | None = None


class ReminderOut(ORM):
    id: uuid.UUID
    experiment_id: uuid.UUID
    experiment_title: str
    is_demo: bool
    title: str
    due_at: datetime
    completed_at: datetime | None
    overdue: bool


class PriorityOut(BaseModel):
    id: str
    title: str
    reason: str
    href: str
    is_demo: bool = False
    urgency: Literal["overdue", "needs_review", "next_step"]


class FocusOut(BaseModel):
    priorities: list[PriorityOut]
    reminders: list[ReminderOut]
    overdue_count: int
    generated_at: datetime
