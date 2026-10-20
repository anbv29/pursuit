"""Optional, bounded founder testimony; never independent source evidence."""

from pydantic import BaseModel, ConfigDict, Field


class FounderReality(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customers: str = Field(default="", max_length=600)
    buying_decision: str = Field(default="", max_length=600)
    pricing: str = Field(default="", max_length=600)
    objections: str = Field(default="", max_length=600)
    recent_result: str = Field(default="", max_length=600)
