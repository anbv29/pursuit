import pytest

from app.core.config import Settings
from app.core.errors import RateLimited
from app.core.ratelimit import RateLimiter

pytestmark = pytest.mark.no_database


def test_rate_limit_capacity_preserves_active_limits(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr("app.core.ratelimit.time.monotonic", lambda: clock[0])
    limiter = RateLimiter(max_keys=2)
    limiter.check("a", 1, 10)
    limiter.check("b", 1, 10)
    with pytest.raises(RateLimited):
        limiter.check("c", 1, 10)
    with pytest.raises(RateLimited):
        limiter.check("a", 1, 10)
    clock[0] = 111
    limiter.check("c", 1, 10)
    assert len(limiter._hits) == 1
    limiter.reset()
    assert not limiter._hits and not limiter._expiry


@pytest.mark.parametrize(
    "origin",
    ["http://example.com", "https://example.com/path", "https://u:p@example.com", "https://localhost", "*"],
)
def test_production_rejects_unsafe_origins(origin):
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            app_env="production",
            cookie_secure=True,
            public_app_url="https://app.example.com",
            cors_origins=origin,
        )


def test_production_accepts_explicit_https_origins():
    settings = Settings(
        _env_file=None,
        app_env="production",
        cookie_secure=True,
        public_app_url="https://app.example.com",
        cors_origins="https://app.example.com",
    )
    assert settings.cookie_secure
