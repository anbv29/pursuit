from uuid import UUID

from sqlalchemy import func, select

from app.core import db as dbmod
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
