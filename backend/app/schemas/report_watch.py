from pydantic import BaseModel, ConfigDict, Field

from app.services.watch_claims import MAX_CLAIMS


class WatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool
    claim_ids: list[str] = Field(default_factory=list, max_length=MAX_CLAIMS)
    reset_baseline: bool = False


class AcknowledgeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    acknowledged: bool
