"""Operator-only CLI. Uses configured database; never creates a provider subscription."""

import argparse
from uuid import UUID

from app.core.db import new_session
from app.core.errors import AppError
from app.services import access_grants, entitlements

parser = argparse.ArgumentParser()
parser.add_argument("--email", required=True)
parser.add_argument("--workspace", required=True, type=UUID)
parser.add_argument("--plan", choices=["founder", "team"], required=True)
parser.add_argument("--reason", required=True)
parser.add_argument("--apply", action="store_true", help="Explicitly apply the audited access grant")
args = parser.parse_args()
if not args.apply:
    raise SystemExit("No change made. Pass --apply to grant the requested workspace access.")
try:
    with new_session() as db:
        access_grants.grant(db, args.email, args.workspace, args.plan, args.reason)
        summary = entitlements.summary(db, args.workspace)
        print(
            {
                key: summary[key]
                for key in ("plan", "seats", "research_remaining", "questions_remaining", "complimentary")
            }
        )
except AppError as exc:
    raise SystemExit(exc.message) from exc
