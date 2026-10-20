"""Private, durable Fo requests, scoped to a user and workspace."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import IdMixin, TimestampMixin


class FoChatTurn(IdMixin, TimestampMixin, Base):
    __tablename__ = "fo_chat_turns"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", "request_key"),
        Index("ix_fo_chat_owner", "workspace_id", "user_id", "created_at"),
        CheckConstraint("mode IN ('demo', 'live')"),
        CheckConstraint(
            "status IN ('PENDING_APPROVAL','RUNNING','WORKING','REPLIED','FAILED','UNKNOWN','CANCELLED')"
        ),
    )

    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    service_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    report_context: Mapped[dict | None] = mapped_column(JSON)
    request_key: Mapped[str] = mapped_column(String(80))
    message: Mapped[str] = mapped_column(Text)
    reply: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="PENDING_APPROVAL")
    mode: Mapped[str] = mapped_column(String(8))
    provider_ref: Mapped[str | None] = mapped_column(String(200))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
