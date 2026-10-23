# ruff: noqa: F811
from datetime import timedelta

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


def test_free_usage_is_zero_and_unknown_calls_are_not_success(api):
    api.signup()
    ws = api.workspace(paid=False)
    with ai_usage.scope(ws):
        call = ai_usage.reserve(ai_usage.model(), 4000)
    ai_usage.settle(call, None)
    with new_session() as db:
        row = db.get(UsageCall, call)
        assert row.status == "UNKNOWN" and row.reserved_usd == 0
    with pytest.raises(AppError, match="disabled"):
        ai_usage.reserve("unapproved-paid-model", 4000)
