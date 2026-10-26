"""Historical preview data remains available to export and account deletion."""

import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import TimestampMixin


class FirstLook(TimestampMixin, Base):
    __tablename__ = "first_looks"
    __table_args__ = (CheckConstraint("status IN ('RUNNING','SUCCEEDED','FAILED')"),)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id", ondelete="SET NULL"))
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("experiments.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(20))
    company_url: Mapped[str] = mapped_column(String(2048))
    audience: Mapped[str] = mapped_column(String(300), default="")
    attempts: Mapped[int] = mapped_column(default=0)
    result: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(String(500))
