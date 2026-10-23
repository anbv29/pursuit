# ruff: noqa: F811
"""Free product access still enforces identity, evidence and resource limits."""

import pytest
from sqlalchemy import func, select

from app.core.db import new_session
from app.models import BillingAccount, BillingUse, CreditGrant
from app.services import fetcher, free_provider, research_sources
from tests.test_reports import BODY, ai_on, fake_ai  # noqa: F401


def test_reports_and_multiple_workspaces_need_no_purchase(api, fake_ai):
    api.signup()
    workspace = api.workspace(paid=False)
    assert api.workspace(name="Another business", paid=False) != workspace
    balance = api.get(f"/api/workspaces/{workspace}/allowance").json()
    assert balance["plan"] == "free" and balance["advanced_research"]
    assert balance["research_remaining"] is None
    response = api.post(f"/api/workspaces/{workspace}/reports", BODY)
    assert response.status_code == 202
    report = api.get(f"/api/workspaces/{workspace}/reports/{response.json()['id']}").json()
    assert report["status"] == "SUCCEEDED"
    with new_session() as db:
        for table in (BillingAccount, BillingUse, CreditGrant):
            assert db.scalar(select(func.count()).select_from(table)) == 0


def test_free_access_does_not_remove_auth_or_enable_checkout(api, other):
    assert api.get("/api/workspaces").status_code == 401
    api.signup()
    workspace = api.workspace(paid=False)
    assert other.get(f"/api/workspaces/{workspace}/allowance").status_code == 404
    for path in ("/api/plans", f"/api/workspaces/{workspace}/billing"):
        assert api.get(path).status_code == 404
    assert api.post(f"/api/workspaces/{workspace}/billing/checkout", {"plan": "team"}).status_code == 404


@pytest.mark.no_database
def test_source_collection_uses_only_fetched_pages(monkeypatch):
    def fetch(url, **kwargs):
        if "private" in url:
            raise fetcher.FetchError("Unreachable")
        return fetcher.Fetched(url, "Public evidence", "Useful public company text." * 3, "hash")

    monkeypatch.setattr(fetcher, "fetch", fetch)
    result = research_sources.collect(
        "https://company.example",
        {
            "known_competitors": "Unverified Name https://competitor.example https://private.example",
        },
    )
    assert {s["url"] for s in result} == {"https://company.example", "https://competitor.example"}
    assert all(s["via"] == "pursuit_fetch" and s["retrieved_at"] for s in result)


@pytest.mark.no_database
def test_free_transport_never_silently_ignores_search_tools(monkeypatch):
    from types import SimpleNamespace

    monkeypatch.setattr(
        free_provider,
        "get_settings",
        lambda: SimpleNamespace(
            ai_enabled=True,
            free_research_model="minimax/minimax-m3.1-flash:free",
        ),
    )
    with pytest.raises(free_provider.APIError, match="source-only"):
        free_provider.Client().parse(system="Research", messages=[], tools=[{"name": "web_search"}])
