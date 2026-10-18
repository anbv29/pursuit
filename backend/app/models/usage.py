import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, utcnow
from app.models.base import IdMixin


class WorkspaceBudget(Base):
    __tablename__ = "workspace_budgets"
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )
    monthly_limit_usd: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=25)
    research_model: Mapped[str] = mapped_column(String(80), default="claude-haiku-5-5")


class UsageCall(IdMixin, Base):
    __tablename__ = "usage_calls"
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    report_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("reports.id", ondelete="SET NULL"))
    billing_use_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("billing_uses.id", ondelete="SET NULL", name="fk_usage_billing_use"), index=True
    )
    model: Mapped[str] = mapped_column(String(80))
    operation: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="RESERVED")
    reserved_usd: Mapped[Decimal] = mapped_column(Numeric(14, 6))
    estimated_usd: Mapped[Decimal | None] = mapped_column(Numeric(14, 6))
    usage: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
