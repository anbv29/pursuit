# ruff: noqa: F811
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.core.db import new_session, utcnow
from app.core.errors import AppError
from app.models import ReportShare, UsageCall
from app.services import ai_usage
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401


def test_share_is_snapshot_revocable_private_and_exported_safely(api, ws, fake_ai, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}/shares"
    response = api.post(path, {"expires_days": 1})
    assert response.status_code == 201, response.text
    share = response.json()
    token = share["url"].rsplit("/", 1)[1]
    public = f"/api/shared-reports/{token}"
    payload = other.get(public).json()
    assert payload["company_name"] == "Acme"
    assert "inputs" not in payload and "created_by" not in payload
    assert other.get(path).status_code == 404
    assert "token_hash" not in str(api.get(path).json())
    exported = api.get(f"/api/workspaces/{ws}/export")
    assert exported.status_code == 200, exported.text
    assert exported.json()["reports"][0]["id"] == rid
    assert "token_hash" not in str(exported.json())
    assert token not in str(exported.json())
    assert api.delete(path + "/" + share["id"]).status_code == 204
    assert other.get(public).status_code == 404


def test_share_expiry_and_invalid_duration(api, ws, fake_ai):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}/shares"
    assert api.post(path, {"expires_days": 31}).status_code == 422
    share = api.post(path, {}).json()
    with new_session() as db:
        row = db.get(ReportShare, share["id"])
        row.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert api.get("/api/shared-reports/" + share["url"].rsplit("/", 1)[1]).status_code == 404


def test_budget_blocks_before_provider_and_records_usage(api, other):
    api.signup()
    ws = api.workspace()
    path = f"/api/workspaces/{ws}/usage"
    assert other.get(path).status_code == 404
    assert (
        api.patch(path, {"monthly_limit_usd": "0", "research_model": "claude-haiku-5-5"}).status_code == 200
    )
    with ai_usage.scope(ws), pytest.raises(AppError, match="budget"):
        ai_usage.reserve("claude-haiku-5-5", 4000)
    assert (
        api.patch(path, {"monthly_limit_usd": "25", "research_model": "claude-haiku-5-5"}).status_code == 200
    )
    with ai_usage.scope(ws):
        call = ai_usage.reserve("claude-haiku-5-5", 4000)
    usage = {"input_tokens": 1000, "output_tokens": 100, "server_tool_use": {"web_search_requests": 1}}
    ai_usage.settle(call, SimpleNamespace(usage=SimpleNamespace(model_dump=lambda **kw: usage)))
    assert ai_usage.estimate("claude-haiku-5-5", usage) == Decimal("0.010150")
    with new_session() as db:
        row = db.get(UsageCall, call)
        assert row.status == "COMPLETED" and row.usage == usage
    result = api.get(path).json()
    assert result["records"][0]["status"] == "COMPLETED"


def test_uncertain_provider_call_keeps_reservation(api):
    api.signup()
    ws = api.workspace()
    with ai_usage.scope(ws):
        call = ai_usage.reserve("claude-haiku-5-5", 4000)
    ai_usage.settle(call, None)
    with new_session() as db:
        row = db.get(UsageCall, call)
        assert row.status == "UNKNOWN" and row.estimated_usd is None
        assert row.reserved_usd > 0
