"""Environment-based configuration. Secrets are read from the environment only."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit"
    test_database_url: str = "postgresql+psycopg://pursuit:pursuit_local_only@localhost:5433/pursuit_test"
    session_secret: SecretStr = SecretStr("dev-only-insecure-secret")
    session_ttl_hours: int = 72
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False

    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = "claude-opus-5-5"
    ai_timeout_seconds: float = 45.0

    fo_mode: Literal["demo", "live"] = "demo"
    fo_mcp_url: str = "https://mcp.api.wajo.ai/fo"
    fo_access_token: SecretStr | None = None
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

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.app_env == "production":
            secret = self.session_secret.get_secret_value()
            if secret == "dev-only-insecure-secret" or len(secret) < 32:  # noqa: S105
                raise ValueError("SESSION_SECRET must be set to a strong value in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
            if "*" in self.cors_origin_list:
                raise ValueError("Wildcard CORS is not allowed in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
