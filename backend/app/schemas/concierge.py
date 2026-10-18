import uuid
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AwareDatetime, BaseModel, Field, field_validator, model_validator

from app.core.db import utcnow


class Coordination(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    invitation: str = Field(min_length=10, max_length=2000)
    timezone: str = Field(min_length=1, max_length=100)
    deadline: AwareDatetime
    max_followups: int = Field(default=0, ge=0, le=1)

    @field_validator("timezone")
    @classmethod
    def valid_zone(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Use a timezone such as Asia/Kolkata or America/New_York.") from exc
        return value


class ConciergeIn(Coordination):
    prospect_ids: list[uuid.UUID] = Field(min_length=1, max_length=5)
    title: str = Field(default="Customer discovery interview", min_length=3, max_length=200)
    window: str = Field(min_length=5, max_length=200)
    duration_minutes: int = Field(default=30, ge=15, le=60)

    @model_validator(mode="after")
    def bounded(self):
        days = (self.deadline - utcnow()).total_seconds() / 86400
        if not 0 < days <= 14:
            raise ValueError("Choose a coordination deadline within the next 14 days.")
        if len(set(self.prospect_ids)) != len(self.prospect_ids):
            raise ValueError("Select each prospect only once.")
        return self


class ReplyIn(BaseModel):
    message: str = Field(min_length=3, max_length=2000)


class MeetingResultIn(BaseModel):
    result: Literal["booked", "declined", "no_response"]
    scheduled_at: AwareDatetime | None = None
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def needs_time(self):
        if self.result == "booked" and self.scheduled_at is None:
            raise ValueError("Enter the confirmed meeting time.")
        return self
