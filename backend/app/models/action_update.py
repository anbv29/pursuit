import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, utcnow
from app.models.base import IdMixin


class ActionUpdate(IdMixin, Base):
    """Local, scoped task history; never imports unrelated Fo conversations."""

    __tablename__ = "action_updates"
    action_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("action_requests.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    state: Mapped[str] = mapped_column(String(30))
    summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
