import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import IdMixin, TimestampMixin


class ReportWatch(IdMixin, TimestampMixin, Base):
    __tablename__ = "report_watches"
    __table_args__ = (Index("ix_report_watches_due", "enabled", "next_check_at"),)

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), unique=True
    )
    enabled: Mapped[bool] = mapped_column(default=False)
    snapshots: Mapped[list] = mapped_column(JSON, default=list)
    generation: Mapped[int] = mapped_column(default=1)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[str | None] = mapped_column(String(64))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WatchAlert(IdMixin, Base):
    __tablename__ = "watch_alerts"
    __table_args__ = (
        UniqueConstraint("watch_id", "dedupe_key", name="uq_watch_alert_receipt"),
        Index("ix_watch_alert_report_created", "report_id", "created_at"),
    )

    watch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("report_watches.id", ondelete="CASCADE"))
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"))
    dedupe_key: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
