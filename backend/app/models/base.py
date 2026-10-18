import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import utcnow


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


def enum_col(cls):
    """Store StrEnum values (not names) as portable VARCHAR."""
    return Enum(cls, native_enum=False, length=40, values_callable=lambda e: [m.value for m in e])
