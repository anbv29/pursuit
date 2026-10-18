import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, utcnow
from app.models.base import IdMixin


class BillingAccount(Base):
    __tablename__ = "billing_accounts"
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )
    customer_id: Mapped[str | None] = mapped_column(String(100))
    subscription_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    status: Mapped[str] = mapped_column(String(30), default="inactive")
    environment: Mapped[str] = mapped_column(String(20))
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)


class CheckoutOrder(IdMixin, Base):
    __tablename__ = "checkout_orders"
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    plan: Mapped[str] = mapped_column(String(20))
    product_id: Mapped[str] = mapped_column(String(100))
    environment: Mapped[str] = mapped_column(String(20))
    session_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    checkout_url: Mapped[str | None] = mapped_column(Text)
    payment_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    state: Mapped[str] = mapped_column(String(30), default="CREATING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CreditGrant(IdMixin, Base):
    __tablename__ = "credit_grants"
    __table_args__ = (CheckConstraint("reports >= 0 AND questions >= 0"),)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    source_key: Mapped[str] = mapped_column(String(200), unique=True)
    payment_id: Mapped[str | None] = mapped_column(String(100), index=True)
    subscription_id: Mapped[str | None] = mapped_column(String(100), index=True)
    plan: Mapped[str] = mapped_column(String(20))
    environment: Mapped[str] = mapped_column(String(20))
    reports: Mapped[int] = mapped_column(Integer)
    questions: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BillingUse(IdMixin, Base):
    __tablename__ = "billing_uses"
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    grant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("credit_grants.id", ondelete="CASCADE"), index=True
    )
    resource_key: Mapped[str] = mapped_column(String(160), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="RESERVED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BillingEvent(Base):
    __tablename__ = "billing_events"
    event_id: Mapped[str] = mapped_column(String(200), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(60))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
