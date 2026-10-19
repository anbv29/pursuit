"""Copy the requested local owner's sign-in/workspace to the selected Neon preview.

Preserves existing target credentials and data; copies no reports, prospect records or sessions.
"""

import argparse
from pathlib import Path
from uuid import UUID

from dotenv import dotenv_values
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import make_engine, new_session
from app.models import Membership, User, Workspace
from app.models.enums import Role
from app.services import access_grants, entitlements

parser = argparse.ArgumentParser()
parser.add_argument("--email", required=True)
parser.add_argument("--workspace", required=True, type=UUID)
parser.add_argument("--apply", action="store_true")
args = parser.parse_args()
if not args.apply:
    raise SystemExit("No change made. Pass --apply to provision the selected preview account.")
if make_url(get_settings().database_url).host not in ("localhost", "127.0.0.1"):
    raise SystemExit("The source must be the local application database.")
values = dotenv_values(Path(__file__).resolve().parents[1] / ".env.preview")
target_url = make_url(values["DATABASE_URL"])
if not target_url.host or not target_url.host.endswith(".neon.tech"):
    raise SystemExit("The target must be the explicitly configured Neon preview database.")
engine = make_engine(target_url.set(drivername="postgresql+psycopg"))
try:
    with new_session() as source, Session(engine) as target:
        owner = source.scalar(
            select(User)
            .join(Membership)
            .where(
                User.email == args.email.strip().lower(),
                Membership.workspace_id == args.workspace,
                Membership.role == Role.OWNER,
            )
        )
        workspace = source.get(Workspace, args.workspace)
        if not owner or not workspace or workspace.is_demo:
            raise SystemExit("The selected account must own a local company workspace.")
        existing = target.scalar(select(User).where(User.email == owner.email))
        if existing is None:
            if target.get(User, owner.id):
                raise SystemExit("Target account identifier conflict; no credentials overwritten.")
            existing = User(
                id=owner.id, email=owner.email, name=owner.name, password_hash=owner.password_hash
            )
            target.add(existing)
            target.flush()
        remote_workspace = target.get(Workspace, workspace.id)
        if remote_workspace is None:
            target.add(Workspace(id=workspace.id, name=workspace.name, is_demo=False))
            target.flush()
            target.add(Membership(workspace_id=workspace.id, user_id=existing.id, role=Role.OWNER))
            target.flush()
        access_grants.grant(target, owner.email, workspace.id, "team", "Owner-authorized launch account")
        status = entitlements.summary(target, workspace.id)
        print(
            {
                "target": "configured Neon preview",
                "plan": status["plan"],
                "seats": status["seats"],
                "complimentary": status["complimentary"],
                "credentials_preserved": True,
            }
        )
except Exception as exc:
    raise SystemExit(
        f"Owner provisioning failed ({type(exc).__name__}); private details suppressed."
    ) from None
finally:
    engine.dispose()
