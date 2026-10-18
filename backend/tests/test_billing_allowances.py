# ruff: noqa: F811
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest

from app.core.db import new_session, utcnow
from app.core.errors import AppError, PaymentRequired
from app.models import CreditGrant
from app.services import ai_usage, entitlements, report_research
from tests.billing_support import billing_provider, signed_event  # noqa: F401
from tests.test_billing_payments import start
from tests.test_reports import BODY, ai_on, fake_ai  # noqa: F401


def purchase(api, provider):
    ws, path, _ = start(api)
    provider.paid()
    assert signed_event(api, "payment.succeeded", {"payment_id": "pay-synthetic"}).status_code == 200
    return ws, path


def test_free_cannot_research_or_create_multiple_free_workspaces(api, fake_ai):
    api.signup()
    ws = api.workspace(paid=False)
    assert api.post(f"/api/workspaces/{ws}/reports", BODY).status_code == 402
    assert api.post("/api/workspaces", {"name": "Another free workspace"}).status_code == 402


def test_completed_report_consumes_pack_and_failed_attempt_releases_it(
    api, billing_provider, fake_ai, monkeypatch
):
    ws, path = purchase(api, billing_provider)
    original = report_research.research

    def fail(*args, **kwargs):
        raise report_research.ResearchError("Synthetic provider failure")

    monkeypatch.setattr(report_research, "research", fail)
    response = api.post(f"/api/workspaces/{ws}/reports", BODY)
    assert response.status_code == 202
    assert api.get(path).json()["research_remaining"] == 1
    monkeypatch.setattr(report_research, "research", original)
    assert api.post(f"/api/workspaces/{ws}/reports", BODY).status_code == 202
    assert api.get(path).json()["research_remaining"] == 0
    assert api.post(f"/api/workspaces/{ws}/reports", BODY).status_code == 402


def test_last_credit_is_reserved_once_under_concurrency(api, billing_provider):
    ws, _ = purchase(api, billing_provider)

    def reserve(_):
        with new_session() as db:
            try:
                use = entitlements.reserve(db, uuid.UUID(ws), "research")
                db.commit()
                return use
            except PaymentRequired:
                db.rollback()
                return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, range(2)))
    assert sum(result is not None for result in results) == 1


def test_revoked_allowance_stops_queued_ai_and_single_pack_has_no_advanced_features(api, billing_provider):
    ws, _ = purchase(api, billing_provider)
    ws = uuid.UUID(ws)
    with new_session() as db:
        with pytest.raises(PaymentRequired):
            entitlements.require_feature(db, ws)
        use_id = entitlements.reserve(db, ws, "research")
        db.commit()
        grant = db.query(CreditGrant).one()
        grant.revoked_at = utcnow()
        db.commit()
    token = ai_usage.BILLING_USE.set(use_id)
    try:
        with ai_usage.scope(ws), pytest.raises(AppError, match="no longer available"):
            ai_usage.reserve("claude-haiku-5-5", 100, max_input=100)
    finally:
        ai_usage.BILLING_USE.reset(token)
