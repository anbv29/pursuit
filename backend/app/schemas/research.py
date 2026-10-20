"""Evidence-linked decisions; generated strategies are never observed outcomes."""

from typing import Literal

from pydantic import BaseModel, Field


class ResearchPlan(BaseModel):
    customer_question: str = Field(max_length=500)
    market_question: str = Field(max_length=500)
    challenge_question: str = Field(max_length=500)


class EvidenceQuote(BaseModel):
    source_id: str
    quote: str = Field(min_length=12, max_length=500)


class StrategicInsight(BaseModel):
    title: str = Field(max_length=160)
    finding: str = Field(max_length=900)
    reasoning: str = Field(max_length=1200)
    implication: str = Field(max_length=600)
    counterargument: str = Field(max_length=700)
    next_test: str = Field(max_length=700)
    decision_if_supported: str = Field(max_length=500)
    decision_if_rejected: str = Field(max_length=500)
    evidence: list[EvidenceQuote] = Field(max_length=4)
    confidence: Literal["low", "medium", "high"]
    status: Literal["interpretation", "hypothesis"] = "hypothesis"
    limitations: list[str] = Field(max_length=5)


class DecisionBrief(BaseModel):
    insights: list[StrategicInsight] = Field(min_length=1, max_length=4)
