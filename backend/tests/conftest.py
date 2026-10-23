"""Tests run the real app against the real Postgres test database (pursuit_test)."""

import os

os.environ["APP_ENV"] = "test"
os.environ["FO_MODE"] = "demo"
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["FREE_PREVIEW_ENABLED"] = "false"
os.environ["FREE_RESEARCH_MODEL"] = "google/gemma-4-31b-it:free"
# Never inherit merchant credentials or product mappings from a private .env.

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core import db as dbmod
from app.core.config import get_settings
from app.core.ratelimit import limiter

get_settings.cache_clear()
dbmod.configure(get_settings().test_database_url)

from app.main import create_app  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_db(request):
    limiter.reset()
    yield
    if request.node.get_closest_marker("no_database"):
        return
    tables = [t.name for t in reversed(dbmod.Base.metadata.sorted_tables)]
    with dbmod.get_engine().begin() as conn:
        conn.execute(text(f"TRUNCATE {', '.join(tables)} CASCADE"))


@pytest.fixture
def app():
    return create_app()


class Api:
    """Test client that tracks the CSRF token like the real frontend does."""

    def __init__(self, app):
        self.client = TestClient(app)
        self.csrf: str | None = None

    def _h(self):
        return {"X-CSRF-Token": self.csrf} if self.csrf else {}

    def get(self, url, **kw):
        return self.client.get(url, **kw)

    def post(self, url, json=None, **kw):
        return self.client.post(url, json=json, headers=self._h(), **kw)

    def patch(self, url, json=None, **kw):
        return self.client.patch(url, json=json, headers=self._h(), **kw)

    def delete(self, url, **kw):
        return self.client.delete(url, headers=self._h(), **kw)

    def signup(self, email="founder@example.com", name="Founder", password="correct-horse-battery"):
        r = self.post("/api/auth/register", {"email": email, "name": name, "password": password})
        assert r.status_code == 201, r.text
        self.csrf = r.json()["csrf_token"]
        return r.json()["user"]

    def workspace(self, name="Acme", *, paid=True):
        r = self.post("/api/workspaces", {"name": name})
        assert r.status_code == 201, r.text
        workspace_id = r.json()["id"]
        return workspace_id


@pytest.fixture
def api(app):
    return Api(app)


@pytest.fixture
def other(app):
    """A second, unrelated user for cross-tenant tests."""
    a = Api(app)
    a.signup(email="intruder@example.com", name="Intruder")
    return a
