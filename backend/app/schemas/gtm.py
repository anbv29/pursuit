from typing import Literal

from pydantic import BaseModel, Field


class GTMConstraints(BaseModel):
    monthly_budget: float | None = Field(default=None, ge=0, le=1_000_000_000, allow_inf_nan=False)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    weekly_hours: float | None = Field(default=None, ge=0, le=168, allow_inf_nan=False)
    team_size: int | None = Field(default=None, ge=1, le=10000)
    horizon_days: Literal[30, 60, 90] = 90
    available_assets: str = Field(default="", max_length=1500)
    channel_constraints: str = Field(default="", max_length=1000)


class Measurement(BaseModel):
    label: str = Field(max_length=200)
    value: str = Field(min_length=1, max_length=80)
    unit: str = Field(max_length=100)
    scope: str = Field(max_length=500)
    period: str = Field(max_length=150)
    source_id: str = Field(max_length=80)
    quote: str = Field(min_length=12, max_length=500)
    caveat: str = Field(max_length=500)
