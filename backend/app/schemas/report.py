"""Report inputs and the report content contract.

`ReportContent` is both the structured-output schema the research model must fill and the
shape the API returns. Every claim carries `kind` (fact / interpretation /
assumption) and `source_ids`; the server re-validates both after generation.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.enums import UseCase
from app.schemas.founder import FounderReality
from app.schemas.research import StrategicInsight

Kind = Literal["fact", "interpretation", "assumption"]
Confidence = Literal["high", "medium", "low"]


class ReportIn(BaseModel):
    company_url: HttpUrl
    company_name: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=3000)
    target_customers: str = Field(default="", max_length=1000)
    stage: Literal["", "idea", "pre_revenue", "early_revenue", "growth"] = ""
    business_model: str = Field(default="", max_length=200)
    pricing: str = Field(default="", max_length=500)
    known_competitors: str = Field(default="", max_length=1000)
    geography: str = Field(default="", max_length=200)
    goal: str = Field(default="", max_length=1000)
    founder_reality: FounderReality = Field(default_factory=FounderReality)

    @field_validator("company_url")
    @classmethod
    def _http_only(cls, v: HttpUrl) -> HttpUrl:
        if v.scheme not in ("http", "https"):
            raise ValueError("Use an http(s) website address.")
        return v


# ---- content contract ---------------------------------------------------------
class Claim(BaseModel):
    text: str
    kind: Kind
    confidence: Confidence
    source_ids: list[str]
    supporting_quote: str = ""


class Snapshot(BaseModel):
    name: str
    one_liner: str
    offering: str
    business_model: str
    stage_assessment: str
    observed_pricing: list[Claim]
    key_facts: list[Claim]


class Segment(BaseModel):
    name: str
    description: str
    pains: list[str]
    buying_trigger: str
    decision_maker: str
    fit_score: int = Field(description="1-5, how well the offering fits this segment")
    rationale: Claim


class Persona(BaseModel):
    title: str
    goals: list[str]
    pains: list[str]
    objections: list[str]
    where_to_find: list[str]


class ProblemHypothesis(BaseModel):
    statement: str
    supporting: list[Claim]
    against: list[Claim]
    how_to_validate: str


class Competitor(BaseModel):
    name: str
    url: str
    positioning: str
    target_customers: str
    pricing: str
    strengths: list[str]
    weaknesses: list[str]
    source_ids: list[str]


class Positioning(BaseModel):
    gaps: list[Claim]
    recommended_statement: str
    differentiators: list[str]


class Pricing(BaseModel):
    market_benchmarks: list[Claim]
    hypotheses: list[str]
    wtp_questions: list[str]


class MessageAngle(BaseModel):
    name: str
    segment: str
    hook: str
    subject: str
    body: str


class Prospecting(BaseModel):
    signals: list[str]
    channels: list[str]
    search_queries: list[str]


class FunnelRisk(BaseModel):
    stage: str
    risk: str
    leading_metric: str
    test: str


class ExperimentIdea(BaseModel):
    use_case: UseCase
    title: str
    hypothesis: str
    metric: str = Field(description="One of the allowed Pursuit metric names")
    comparator: Literal[">=", "<=", ">", "<"]
    target: float
    min_sample: int
    why_first: str
    effort: Literal["low", "medium", "high"]


class ReportContent(BaseModel):
    decision_brief: list[StrategicInsight] = Field(default_factory=list)
    executive_summary: list[str]
    snapshot: Snapshot
    segments: list[Segment]
    personas: list[Persona]
    problems: list[ProblemHypothesis]
    competitors: list[Competitor]
    positioning: Positioning
    pricing: Pricing
    messaging: list[MessageAngle]
    prospecting: Prospecting
    funnel_risks: list[FunnelRisk]
    experiments: list[ExperimentIdea]
    risks_and_unknowns: list[str]
    focus_first: str


class SourceOut(BaseModel):
    id: str
    url: str
    title: str
    via: str
    retrieved_at: str | None = None


class ReportOut(BaseModel):
    id: uuid.UUID
    company_url: str
    company_name: str
    inputs: dict
    status: str
    progress: str
    content: dict | None
    sources: list[SourceOut]
    model: str | None
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class ReportListItem(BaseModel):
    id: uuid.UUID
    company_url: str
    company_name: str
    status: str
    progress: str
    created_at: datetime


# ---- synthesis parts (each small enough for one structured-output call) ---------
class PartProfile(BaseModel):
    executive_summary: list[str]
    snapshot: Snapshot
    segments: list[Segment]
    personas: list[Persona]
    problems: list[ProblemHypothesis]


class PartMarket(BaseModel):
    competitors: list[Competitor]
    positioning: Positioning
    pricing: Pricing


class PartPlan(BaseModel):
    messaging: list[MessageAngle]
    prospecting: Prospecting
    funnel_risks: list[FunnelRisk]
    experiments: list[ExperimentIdea]
    risks_and_unknowns: list[str]
    focus_first: str
