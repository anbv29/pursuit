# ruff: noqa: F811
import uuid

import pytest
from sqlalchemy import func, select

from app.core.db import new_session
from app.models import ActionRequest, OutcomeEvent
from app.models.enums import ActionStatus
from app.services import delivery_tracking
from tests.test_actions import _request, exp_url  # noqa: F401


def test_verified_delivery_is_idempotent_and_tenant_scoped(api, exp_url, monkeypatch, other):
    action = _request(api, exp_url)
    with new_session() as db:
        row = db.get(ActionRequest, action["id"])
        row.mode, row.status = "live", ActionStatus.UNKNOWN
        db.commit()
    monkeypatch.setattr(delivery_tracking, "configured", lambda _: True)
    message_id = str(uuid.uuid4())
    monkeypatch.setattr(
        delivery_tracking,
        "retrieve",
        lambda _: {
            "id": message_id,
            "to": [action["target"]],
            "subject": "Quick question",
            "last_event": "delivered",
        },
    )
    path = f"{exp_url}/actions/{action['id']}/tracking"
    assert other.post(path, {"provider_message_id": message_id}).status_code == 404
    for _ in range(2):
        response = api.post(path, {"provider_message_id": message_id})
        assert response.status_code == 200, response.text
        assert response.json()["last_event"] == "delivered"
    with new_session() as db:
        assert (
            db.scalar(select(func.count(OutcomeEvent.id)).where(OutcomeEvent.action_id == action["id"])) == 2
        )
        assert db.get(ActionRequest, action["id"]).status == ActionStatus.SUCCEEDED


@pytest.mark.parametrize("event", ["unknown", "failed"])
def test_unverified_delivery_does_not_create_success(api, exp_url, monkeypatch, event):
    action = _request(api, exp_url)
    with new_session() as db:
        row = db.get(ActionRequest, action["id"])
        row.mode, row.status = "live", ActionStatus.UNKNOWN
        db.commit()
    monkeypatch.setattr(delivery_tracking, "configured", lambda _: True)
    monkeypatch.setattr(
        delivery_tracking,
        "retrieve",
        lambda _: {
            "to": [action["target"]],
            "subject": "Quick question",
            "last_event": event,
        },
    )
    path = f"{exp_url}/actions/{action['id']}/tracking"
    assert api.post(path, {"provider_message_id": str(uuid.uuid4())}).status_code == 200
    with new_session() as db:
        assert (
            db.scalar(select(func.count(OutcomeEvent.id)).where(OutcomeEvent.action_id == action["id"])) == 0
        )
        assert db.get(ActionRequest, action["id"]).status == ActionStatus.UNKNOWN


def test_mismatched_email_and_unconfigured_provider_are_rejected(api, exp_url, monkeypatch):
    action = _request(api, exp_url)
    path = f"{exp_url}/actions/{action['id']}/tracking"
    assert api.post(path, {"provider_message_id": str(uuid.uuid4())}).status_code == 400
    with new_session() as db:
        row = db.get(ActionRequest, action["id"])
        row.mode, row.status = "live", ActionStatus.UNKNOWN
        db.commit()
    monkeypatch.setattr(delivery_tracking, "configured", lambda _: True)
    monkeypatch.setattr(
        delivery_tracking,
        "retrieve",
        lambda _: {
            "to": ["unapproved@example.com"],
            "subject": "Quick question",
            "last_event": "delivered",
        },
    )
    response = api.post(path, {"provider_message_id": str(uuid.uuid4())})
    assert response.status_code == 400 and "does not match" in response.text
