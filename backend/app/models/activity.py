import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, utcnow
from app.models.base import IdMixin, TimestampMixin, enum_col
from app.models.enums import ActionKind, ActionStatus, DataOrigin, OutcomeKind


class Prospect(IdMixin, TimestampMixin, Base):
    __tablename__ = "prospects"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    company: Mapped[str] = mapped_column(String(160), default="")
    role: Mapped[str] = mapped_column(String(160), default="")
    email: Mapped[str | None] = mapped_column(String(320))  # sensitive: masked for non-owners
    segment: Mapped[str] = mapped_column(String(120), default="")
    source_url: Mapped[str | None] = mapped_column(String(2048))
    context: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="identified")
    origin: Mapped[DataOrigin] = mapped_column(enum_col(DataOrigin), default=DataOrigin.MANUAL)


class Interview(IdMixin, TimestampMixin, Base):
    __tablename__ = "interviews"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    prospect_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prospects.id", ondelete="SET NULL"))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="planned")  # planned|completed|no_show
    notes: Mapped[str] = mapped_column(Text, default="")
    pain_points: Mapped[list] = mapped_column(JSON, default=list)
    current_solution: Mapped[str] = mapped_column(Text, default="")
    frequency: Mapped[str] = mapped_column(String(120), default="")
    cost_of_problem: Mapped[str] = mapped_column(String(160), default="")
    budget_owner: Mapped[str] = mapped_column(String(160), default="")
    wtp_signal: Mapped[str] = mapped_column(String(20), default="none")  # none|verbal|commitment
    contradictions: Mapped[str] = mapped_column(Text, default="")
    origin: Mapped[DataOrigin] = mapped_column(enum_col(DataOrigin), default=DataOrigin.MANUAL)


class MessageVariant(IdMixin, Base):
    __tablename__ = "message_variants"
    __table_args__ = (UniqueConstraint("experiment_id", "label"),)

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(40))
    subject: Mapped[str] = mapped_column(String(200), default="")
    body: Mapped[str] = mapped_column(Text)
    angle: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ActionRequest(IdMixin, TimestampMixin, Base):
    """An external action. Nothing executes until a human approves it."""

    __tablename__ = "action_requests"
    __table_args__ = (Index("ix_actions_ws_status", "workspace_id", "status"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[ActionKind] = mapped_column(enum_col(ActionKind))
    mode: Mapped[str] = mapped_column(String(10))  # demo | live
    target: Mapped[str] = mapped_column(String(320))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    prospect_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prospects.id", ondelete="SET NULL"))
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("message_variants.id", ondelete="SET NULL")
    )
    status: Mapped[ActionStatus] = mapped_column(
        enum_col(ActionStatus), default=ActionStatus.PENDING_APPROVAL
    )
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    requested_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decided_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(default=0)
    provider_ref: Mapped[str | None] = mapped_column(String(200))
    fo_state: Mapped[str | None] = mapped_column(String(30))
    result_summary: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(String(1000))


class OutcomeEvent(IdMixin, Base):
    __tablename__ = "outcome_events"
    __table_args__ = (Index("ix_outcomes_exp_kind", "experiment_id", "kind"),)

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[OutcomeKind] = mapped_column(enum_col(OutcomeKind))
    variant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("message_variants.id", ondelete="SET NULL")
    )
    prospect_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("prospects.id", ondelete="SET NULL"))
    action_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("action_requests.id", ondelete="SET NULL"))
    value: Mapped[float | None] = mapped_column(Float)
    note: Mapped[str] = mapped_column(Text, default="")
    origin: Mapped[DataOrigin] = mapped_column(enum_col(DataOrigin), default=DataOrigin.MANUAL)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FunnelSnapshot(IdMixin, Base):
    """Stage counts for funnel diagnosis. Conversions are computed in code, not stored."""

    __tablename__ = "funnel_snapshots"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(120), default="")
    stages: Mapped[list] = mapped_column(JSON)  # [{"name": str, "count": int}]
    origin: Mapped[DataOrigin] = mapped_column(enum_col(DataOrigin), default=DataOrigin.MANUAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
