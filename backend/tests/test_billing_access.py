import uuid
from datetime import timedelta

import pytest

from app.core.db import new_session, utcnow
from app.core.errors import AppError
from app.models import BillingAccount, User
from app.services import ai_usage, entitlements


def test_team_seats_include_owner_and_removal_frees_a_seat(api):
    api.signup()
    ws = api.workspace()
    path = f"/api/workspaces/{ws}"
    members = []
    # Create synthetic users directly to avoid conflating auth abuse throttling with seat limits.
    with new_session() as db:
        for i in range(5):
            db.add(User(email=f"seat{i}@example.com", name=f"Seat {i}", password_hash="not-a-login-hash"))
        db.commit()
    for i in range(4):
        response = api.post(path + "/members", {"email": f"seat{i}@example.com"})
        assert response.status_code == 201, response.text
        members.append(response.json())
    assert api.post(path + "/members", {"email": "seat4@example.com"}).status_code == 402
    assert len(api.get(path + "/members").json()) == 5
    assert api.delete(path + "/members/" + members[0]["user_id"]).status_code == 204
    assert api.post(path + "/members", {"email": "seat4@example.com"}).status_code == 201


def test_member_cannot_manage_billing_and_expired_team_cannot_write(api, other):
    api.signup()
    ws = api.workspace()
    path = f"/api/workspaces/{ws}"
    assert api.post(path + "/members", {"email": "intruder@example.com"}).status_code == 201
    assert other.get(path + "/billing").status_code == 403
    assert other.get(path + "/allowance").status_code == 200
    with new_session() as db:
        account = db.get(BillingAccount, uuid.UUID(ws))
        account.period_end = utcnow() - timedelta(seconds=1)
        db.commit()
    assert other.get(path + "/experiments").status_code == 200
    assert (
        other.post(
            path + "/experiments",
            {
                "title": "Blocked write",
                "hypothesis": "A sufficiently detailed hypothesis",
                "use_case": "segment",
            },
        ).status_code
        == 403
    )
    assert api.post(path + "/members", {"email": "founder@example.com"}).status_code == 409


def test_paid_model_and_per_job_budget_are_enforced_before_provider(api):
    api.signup()
    ws = uuid.UUID(api.workspace())
    with new_session() as db:
        use = entitlements.reserve(db, ws, "question")
        db.commit()
    token = ai_usage.BILLING_USE.set(use)
    try:
        with ai_usage.scope(ws), pytest.raises(AppError, match="safety budget"):
            ai_usage.reserve("claude-opus-5-5", 100, max_input=100)
        with ai_usage.scope(ws), pytest.raises(AppError, match="safety budget"):
            ai_usage.reserve("claude-haiku-5-5", 100, searches=20, max_input=100)
    finally:
        ai_usage.BILLING_USE.reset(token)
