import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base, utcnow
from app.models.base import IdMixin, TimestampMixin
from app.models.enums import DataOrigin, Decision, EvidenceKind, Stage, Stance, UseCase


def _enum(cls):
    return Enum(cls, native_enum=False, length=40, values_callable=lambda e: [m.value for m in e])


class Experiment(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiments"
    __table_args__ = (Index("ix_experiments_ws_updated", "workspace_id", "updated_at"),)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    use_case: Mapped[UseCase] = mapped_column(_enum(UseCase))
    title: Mapped[str] = mapped_column(String(160))
    hypothesis: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[Stage] = mapped_column(_enum(Stage), default=Stage.HYPOTHESIS)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    is_demo: Mapped[bool] = mapped_column(default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    criteria: Mapped[list["SuccessCriterion"]] = relationship(
        back_populates="experiment", cascade="all, delete-orphan", order_by="SuccessCriterion.created_at"
    )


class SuccessCriterion(IdMixin, Base):
    __tablename__ = "success_criteria"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    metric: Mapped[str] = mapped_column(String(80))
    comparator: Mapped[str] = mapped_column(String(4))  # >=, <=, >, <
    target: Mapped[float] = mapped_column(Float)
    min_sample: Mapped[int] = mapped_column(default=0)
    description: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    experiment: Mapped[Experiment] = relationship(back_populates="criteria")


class Source(IdMixin, Base):
    """A research source with provenance. Content is untrusted input."""

    __tablename__ = "sources"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    experiment_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(2048))
    title: Mapped[str] = mapped_column(String(300), default="")
    excerpt: Mapped[str] = mapped_column(Text, default="")
    content_sha256: Mapped[str | None] = mapped_column(String(64))
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    origin: Mapped[DataOrigin] = mapped_column(_enum(DataOrigin), default=DataOrigin.MANUAL)


class Evidence(IdMixin, Base):
    __tablename__ = "evidence"
    __table_args__ = (CheckConstraint("relevance >= 0 AND relevance <= 1", name="ck_relevance"),)

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sources.id", ondelete="SET NULL"))
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    kind: Mapped[EvidenceKind] = mapped_column(_enum(EvidenceKind))
    stance: Mapped[Stance] = mapped_column(_enum(Stance), default=Stance.NEUTRAL)
    claim: Mapped[str] = mapped_column(Text)
    relevance: Mapped[float] = mapped_column(Float, default=0.5)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    origin: Mapped[DataOrigin] = mapped_column(_enum(DataOrigin), default=DataOrigin.MANUAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    source: Mapped[Source | None] = relationship()


class Recommendation(IdMixin, Base):
    __tablename__ = "recommendations"

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True
    )
    decision: Mapped[Decision] = mapped_column(_enum(Decision))
    confidence: Mapped[float] = mapped_column(Float)
    rationale: Mapped[str] = mapped_column(Text)
    assumptions: Mapped[list] = mapped_column(JSON, default=list)
    counterevidence: Mapped[list] = mapped_column(JSON, default=list)
    limitations: Mapped[list] = mapped_column(JSON, default=list)
    next_action: Mapped[str] = mapped_column(Text)
    evidence_ids: Mapped[list] = mapped_column(JSON, default=list)
    metrics_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_by: Mapped[str] = mapped_column(String(40))  # "rules" | "claude:<model>"
    includes_demo_data: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
