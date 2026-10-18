import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import IdMixin, TimestampMixin


class Report(IdMixin, TimestampMixin, Base):
    """A full GTM analysis of one company, generated from its website + inputs.

    status: QUEUED -> RUNNING -> SUCCEEDED | FAILED
    `content` holds the validated report; `sources` every URL actually retrieved.
    """

    __tablename__ = "reports"
    __table_args__ = (Index("ix_reports_ws_created", "workspace_id", "created_at"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    company_url: Mapped[str] = mapped_column(String(2048))
    company_name: Mapped[str] = mapped_column(String(160), default="")
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="QUEUED")
    progress: Mapped[str] = mapped_column(String(300), default="Queued")
    content: Mapped[dict | None] = mapped_column(JSON)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    model: Mapped[str | None] = mapped_column(String(80))
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
