import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.enums import ActionKind, ActionStatus
from app.schemas.common import ORM
from app.schemas.concierge import Coordination


class EmailPayload(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


class MeetingPayload(BaseModel):
    title: str = Field(default="Customer conversation", max_length=200)
    window: str = Field(default="in the next 7 days", max_length=200)
    duration_minutes: int = Field(default=30, ge=15, le=120)
    note: str = Field(default="", max_length=2000)
    coordination: Coordination | None = None


class ResearchPayload(BaseModel):
    question: str = Field(min_length=10, max_length=2000)


class ActionIn(BaseModel):
    kind: ActionKind
    target: str = Field(default="", max_length=320)
    payload: dict = Field(default_factory=dict)
    prospect_id: uuid.UUID | None = None
    variant_id: uuid.UUID | None = None
    idempotency_key: str | None = Field(
        default=None, min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$"
    )

    @model_validator(mode="after")
    def _validate_payload(self) -> "ActionIn":
        model = {
            ActionKind.SEND_EMAIL: EmailPayload,
            ActionKind.SCHEDULE_MEETING: MeetingPayload,
            ActionKind.RESEARCH_TASK: ResearchPayload,
        }[self.kind]
        self.payload = model.model_validate(self.payload).model_dump(mode="json", exclude_none=True)
        if self.kind in (ActionKind.SEND_EMAIL, ActionKind.SCHEDULE_MEETING):
            # Recipient must be a single valid email address.
            class _T(BaseModel):
                email: EmailStr

            self.target = str(_T(email=self.target).email)
        else:
            self.target = "research"
        return self


class DecisionIn(BaseModel):
    decision: Literal["approve", "reject"]
    note: str = Field(default="", max_length=500)


class ConfirmIn(BaseModel):
    outcome: Literal["succeeded", "failed"]
    note: str = Field(default="", max_length=500)


class ActionOut(ORM):
    id: uuid.UUID
    experiment_id: uuid.UUID
    kind: ActionKind
    mode: str
    target: str
    payload: dict
    prospect_id: uuid.UUID | None
    variant_id: uuid.UUID | None
    status: ActionStatus
    idempotency_key: str
    requested_by: uuid.UUID | None
    decided_by: uuid.UUID | None
    decided_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    attempts: int
    result_summary: str | None
    fo_state: str | None
    error: str | None
    created_at: datetime
