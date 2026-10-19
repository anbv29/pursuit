"""Operator-issued access, separate from provider subscriptions and payments."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, utcnow
from app.models.base import IdMixin


class ComplimentaryAccess(IdMixin, Base):
    __tablename__ = "complimentary_access"
    __table_args__ = (CheckConstraint("plan IN ('founder', 'team')"),)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True
    )
    plan: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(240))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
