"""Private interview provenance and shared, in-app experiment reminders."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import IdMixin, TimestampMixin


class InterviewCapture(IdMixin, TimestampMixin, Base):
    __tablename__ = "interview_captures"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(160))
    transcript: Mapped[str] = mapped_column(Text)


class InterviewHighlight(IdMixin, Base):
    __tablename__ = "interview_highlights"
    __table_args__ = (
        CheckConstraint("start_offset >= 0 AND end_offset > start_offset", name="ck_highlight_offsets"),
    )

    capture_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_captures.id", ondelete="CASCADE"), index=True
    )
    category: Mapped[str] = mapped_column(String(30))
    quote: Mapped[str] = mapped_column(Text)
    start_offset: Mapped[int] = mapped_column(Integer)
    end_offset: Mapped[int] = mapped_column(Integer)
    evidence_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("evidence.id", ondelete="SET NULL"))


class ExperimentReminder(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiment_reminders"
    __table_args__ = (Index("ix_reminders_due", "completed_at", "due_at"),)

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(160))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
