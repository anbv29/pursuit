import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"
    action_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("action_requests.id", ondelete="CASCADE"), primary_key=True
    )
    provider_message_id: Mapped[str] = mapped_column(String(100), unique=True)
    provider: Mapped[str] = mapped_column(String(30), default="resend")
    last_event: Mapped[str] = mapped_column(String(40), default="unknown")
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(String(300))
