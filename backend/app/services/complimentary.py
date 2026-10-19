"""Monthly complimentary allowances. Call provision only under the workspace lock."""

from datetime import UTC, datetime

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import utcnow
from app.models import ComplimentaryAccess, CreditGrant
from app.services.plans import PLANS


def active(db, workspace_id):
    return db.scalar(
        select(ComplimentaryAccess).where(
            ComplimentaryAccess.workspace_id == workspace_id, ComplimentaryAccess.revoked_at.is_(None)
        )
    )


def period(access):
    now = utcnow()
    end = datetime(now.year + (now.month == 12), now.month % 12 + 1, 1, tzinfo=UTC)
    key = f"complimentary:{access.id}:{get_settings().dodo_environment}:{now:%Y-%m}"
    return key, end


def provision(db, workspace_id):
    access = active(db, workspace_id)
    if not access:
        return
    key, end = period(access)
    if db.scalar(select(CreditGrant.id).where(CreditGrant.source_key == key)):
        return
    spec = PLANS[access.plan]
    db.add(
        CreditGrant(
            workspace_id=workspace_id,
            source_key=key,
            plan=access.plan,
            environment=get_settings().dodo_environment,
            reports=spec["reports"],
            questions=spec["questions"],
            expires_at=end,
        )
    )
    db.flush()


def unprovisioned_allowance(db, workspace_id):
    access = active(db, workspace_id)
    if not access:
        return 0, 0
    key, _ = period(access)
    if db.scalar(select(CreditGrant.id).where(CreditGrant.source_key == key)):
        return 0, 0
    return PLANS[access.plan]["reports"], PLANS[access.plan]["questions"]
