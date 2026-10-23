"""Environment-based configuration. Secrets are read from the environment only."""

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit"
    test_database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit_test"
    session_ttl_hours: int = Field(default=72, ge=1, le=720)
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    # Abuse limits (per client IP). Raise only for local E2E runs.
    register_limit_per_hour: int = Field(default=10, ge=1)
    login_limit_per_10min: int = Field(default=20, ge=1)
    # Number of trusted reverse proxies that append to X-Forwarded-For (0 = use socket peer).
    trusted_proxy_hops: int = Field(default=0, ge=0, le=5)

    openrouter_api_key: SecretStr | None = None
    # Enable only after provider approval for third-party application use.
    free_preview_enabled: bool = True
    # Explicit free model IDs only: never fall back to a paid provider/model.
    free_research_model: Literal[
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "minimax/minimax-m3.1-flash:free",
    ] = "minimax/minimax-m3.1-flash:free"
    report_worker_enabled: bool = True
    resend_api_key: SecretStr | None = None
    resend_workspace_id: str = ""
    ai_timeout_seconds: float = 45.0
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
    def research_model(self) -> str:
        return self.free_research_model

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openrouter_api_key and self.openrouter_api_key.get_secret_value())

    @field_validator(
        "openrouter_api_key",
        "fo_access_token",
        mode="before",
    )
    @classmethod
    def _trim_optional_secrets(cls, value):
        return value.strip() if isinstance(value, str) else value

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
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
            if "*" in self.cors_origin_list:
                raise ValueError("Wildcard CORS is not allowed in production")
            for origin in [self.public_app_url, *self.cors_origin_list]:
                parsed = urlsplit(origin)
                if (
                    parsed.scheme != "https"
                    or not parsed.hostname
                    or parsed.username
                    or parsed.password
                    or parsed.path not in ("", "/")
                    or parsed.query
                    or parsed.fragment
                    or parsed.hostname in ("localhost", "127.0.0.1", "::1")
                ):
                    raise ValueError("Production public URL and CORS entries must be HTTPS origins")
            if not self.cors_origin_list:
                raise ValueError("Production requires an explicit CORS origin")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
