"""Read-only launch status. Never prints passwords, keys or connection strings."""

import argparse

from sqlalchemy import select

from app.core.config import get_settings
from app.core.db import new_session
from app.models import BillingAccount, Membership, User, Workspace

parser = argparse.ArgumentParser()
parser.add_argument("email")
args = parser.parse_args()
settings = get_settings()
print(
    {
        "ai_configured": settings.ai_enabled,
        "fo_mode": settings.fo_mode,
        "billing_mode": settings.dodo_environment,
        "webhook_key_configured": bool(
            settings.dodo_webhook_key and settings.dodo_webhook_key.get_secret_value()
        ),
    }
)
with new_session() as db:
    user = db.scalar(select(User).where(User.email == args.email.lower()))
    print({"account_exists": user is not None})
    if user:
        rows = db.execute(select(Workspace, Membership).join(Membership).where(Membership.user_id == user.id))
        for workspace, membership in rows:
            billing = db.get(BillingAccount, workspace.id)
            print(
                {
                    "workspace_id": str(workspace.id),
                    "name": workspace.name,
                    "role": membership.role.value,
                    "demo": workspace.is_demo,
                    "billing_plan": billing.plan if billing else "free",
                    "has_subscription": bool(billing and billing.subscription_id),
                }
            )
