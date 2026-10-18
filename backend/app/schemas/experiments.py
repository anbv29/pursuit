import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import Stage, UseCase
from app.schemas.common import ORM

Comparator = Literal[">=", "<=", ">", "<"]


class CriterionIn(BaseModel):
    metric: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")
    comparator: Comparator = ">="
    target: float = Field(ge=0, le=1_000_000)
    min_sample: int = Field(default=0, ge=0, le=100_000)
    description: str = Field(default="", max_length=300)


class CriterionOut(ORM):
    id: uuid.UUID
    metric: str
    comparator: str
    target: float
    min_sample: int
    description: str


class ExperimentIn(BaseModel):
    use_case: UseCase
    title: str = Field(min_length=3, max_length=160)
    hypothesis: str = Field(min_length=10, max_length=4000)
    target_audience: str = Field(default="", max_length=2000)
    config: dict = Field(default_factory=dict)
    criteria: list[CriterionIn] = Field(default_factory=list, max_length=10)


class ExperimentPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    hypothesis: str | None = Field(default=None, min_length=10, max_length=4000)
    target_audience: str | None = Field(default=None, max_length=2000)
    config: dict | None = None


class TransitionIn(BaseModel):
    to: Stage
    note: str = Field(default="", max_length=500)


class ExperimentOut(ORM):
    id: uuid.UUID
    workspace_id: uuid.UUID
    use_case: UseCase
    title: str
    hypothesis: str
    target_audience: str
    stage: Stage
    config: dict
    is_demo: bool
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    criteria: list[CriterionOut]


class StageStatus(BaseModel):
    stage: Stage
    state: Literal["done", "current", "upcoming"]
    ready: bool
    blocker: str | None


class ExperimentDetail(ExperimentOut):
    stages: list[StageStatus]
    counts: dict[str, int]


class TimelineItem(BaseModel):
    id: uuid.UUID
    action: str
    actor_name: str | None
    detail: dict
    created_at: datetime
