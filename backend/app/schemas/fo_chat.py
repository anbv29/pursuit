import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORM


class FoChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    request_key: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")

    @field_validator("message")
    @classmethod
    def clean_message(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 and c not in "\n\t" for c in value):
            raise ValueError("Enter a message without control characters.")
        return value


class FoChatOut(ORM):
    id: uuid.UUID
    message: str
    reply: str | None
    status: str
    mode: str
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime
