from datetime import timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select

from app.core import db as dbmod
from app.core.db import utcnow
from app.core.errors import NotFound, PaymentRequired
from app.models import BillingAccount, CreditGrant
from app.services import access_grants, entitlements


def test_complimentary_team_is_not_a_subscription(api):
    user = api.signup()
    workspace = UUID(api.workspace(paid=False))
    with dbmod.new_session() as db:
        for _ in range(2):
            access_grants.grant(db, user["email"], workspace, "team", "Owner-authorized complimentary access")
        summary = entitlements.summary(db, workspace)
        assert summary["plan"] == "team" and summary["complimentary"]
        assert (summary["seats"], summary["research_remaining"], summary["questions_remaining"]) == (
            5,
            10,
            200,
        )
        assert db.get(BillingAccount, workspace) is None
        assert db.scalar(select(func.count(CreditGrant.id))) == 1
        use = entitlements.reserve(db, workspace, "research")
        entitlements.finish(db, use, True)
        db.commit()
        assert entitlements.summary(db, workspace)["research_remaining"] == 9
        access_grants.grant(db, user["email"], workspace, "team", "Repeated command")
        assert entitlements.summary(db, workspace)["research_remaining"] == 9
    assert api.get(f"/api/workspaces/{workspace}/allowance").json()["plan"] == "team"


def test_revocation_and_new_month_do_not_reset_used_credits(api, monkeypatch):
    user = api.signup()
    workspace = UUID(api.workspace(paid=False))
    with dbmod.new_session() as db:
        access = access_grants.grant(db, user["email"], workspace, "team", "Authorized owner")
        use = entitlements.reserve(db, workspace, "research")
        entitlements.finish(db, use, True)
        db.commit()
        future = utcnow() + timedelta(days=32)
        monkeypatch.setattr("app.services.complimentary.utcnow", lambda: future)
        assert entitlements.summary(db, workspace)["research_remaining"] == 10
        entitlements.reserve(db, workspace, "research")
        db.commit()
        assert entitlements.summary(db, workspace)["research_remaining"] == 9
        access.revoked_at = utcnow()
        db.commit()
        assert entitlements.summary(db, workspace)["plan"] == "free"
        assert entitlements.summary(db, workspace)["research_remaining"] == 0
        with pytest.raises(PaymentRequired):
            entitlements.reserve(db, workspace, "research")


def test_grant_is_operator_only_and_cannot_override_suspension(api):
    user = api.signup()
    workspace = UUID(api.workspace(paid=False))
    assert api.post(f"/api/workspaces/{workspace}/billing/grant", {"plan": "team"}).status_code == 404
    with dbmod.new_session() as db:
        with pytest.raises(NotFound):
            access_grants.grant(db, "other@example.com", workspace, "team", "Wrong owner")
        db.rollback()
        access_grants.grant(db, user["email"], workspace, "team", "Authorized owner")
        db.add(BillingAccount(workspace_id=workspace, environment="test_mode", suspended=True))
        db.commit()
        assert entitlements.summary(db, workspace)["plan"] == "free"
        assert not entitlements.summary(db, workspace)["complimentary"]
        with pytest.raises(PaymentRequired):
            entitlements.reserve(db, workspace, "question")
