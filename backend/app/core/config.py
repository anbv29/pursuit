"""Environment-based configuration. Secrets are read from the environment only."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit"
    test_database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit_test"
    session_ttl_hours: int = 72
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    # Abuse limits (per client IP). Raise only for local E2E runs.
    register_limit_per_hour: int = Field(default=10, ge=1)
    login_limit_per_10min: int = Field(default=20, ge=1)
    # Number of trusted reverse proxies that append to X-Forwarded-For (0 = use socket peer).
    trusted_proxy_hops: int = Field(default=0, ge=0, le=5)

    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-haiku-5-5"
    research_model: str = "claude-haiku-5-5"
    report_worker_enabled: bool = True
    resend_api_key: SecretStr | None = None
    resend_workspace_id: str = ""
    ai_timeout_seconds: float = 45.0
    dodo_api_key: SecretStr | None = Field(default=None, validation_alias="DODO_PAYMENTS_API_KEY")
    dodo_webhook_key: SecretStr | None = Field(default=None, validation_alias="DODO_PAYMENTS_WEBHOOK_KEY")
    dodo_environment: Literal["test_mode", "live_mode"] = Field(
        default="test_mode", validation_alias="DODO_PAYMENTS_ENVIRONMENT"
    )
    dodo_business_id: str = ""
    dodo_single_product: str = ""
    dodo_founder_product: str = ""
    dodo_team_product: str = ""

    fo_mode: Literal["demo", "live"] = "demo"
    # Emergency stop: when true, no external action can be approved or executed.
    actions_disabled: bool = False
    fo_mcp_url: str = "https://mcp.api.wajo.ai/fo"
    fo_access_token: SecretStr | None = None
    connection_encryption_key: SecretStr | None = None
    fo_oauth_issuer: str = "https://mcp.api.wajo.ai"
    public_app_url: str = "http://localhost:3000"
    fo_timeout_seconds: float = 60.0
    fo_max_poll_seconds: int = 600
    fo_daily_action_limit: int = Field(default=50, ge=1)

    research_fetch_max_bytes: int = 2_000_000
    research_fetch_timeout_seconds: float = 10.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.anthropic_api_key and self.anthropic_api_key.get_secret_value())

    @field_validator("database_url", "test_database_url")
    @classmethod
    def _psycopg_driver(cls, v: str) -> str:
        # Neon/Render hand out postgres:// or postgresql:// URLs; use the psycopg 3 driver.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix) :]
        return v

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.app_env == "production":
            if (
                self.dodo_api_key
                and self.dodo_api_key.get_secret_value()
                and self.dodo_environment != "live_mode"
            ):
                raise ValueError("Production billing requires DODO_PAYMENTS_ENVIRONMENT=live_mode")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
            if "*" in self.cors_origin_list:
                raise ValueError("Wildcard CORS is not allowed in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
