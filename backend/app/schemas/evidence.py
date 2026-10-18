import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.models.enums import DataOrigin, EvidenceKind, Stance
from app.schemas.common import ORM


class SourceIn(BaseModel):
    url: HttpUrl
    title: str = Field(default="", max_length=300)
    excerpt: str = Field(default="", max_length=8000)

    @field_validator("url")
    @classmethod
    def _http_only(cls, v: HttpUrl) -> HttpUrl:
        if v.scheme not in ("http", "https"):
            raise ValueError("Only http(s) URLs are allowed.")
        return v


class FetchIn(BaseModel):
    url: HttpUrl


class SourceOut(ORM):
    id: uuid.UUID
    url: str
    title: str
    excerpt: str
    content_sha256: str | None
    retrieved_at: datetime
    origin: DataOrigin


class EvidenceIn(BaseModel):
    kind: EvidenceKind
    stance: Stance = Stance.NEUTRAL
    claim: str = Field(min_length=3, max_length=4000)
    relevance: float = Field(default=0.5, ge=0, le=1)
    source_id: uuid.UUID | None = None
    tags: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("tags")
    @classmethod
    def _tags(cls, v: list[str]) -> list[str]:
        return [t.strip()[:40] for t in v if t.strip()]


class EvidenceOut(ORM):
    id: uuid.UUID
    kind: EvidenceKind
    stance: Stance
    claim: str
    relevance: float
    tags: list[str]
    origin: DataOrigin
    created_at: datetime
    source: SourceOut | None
