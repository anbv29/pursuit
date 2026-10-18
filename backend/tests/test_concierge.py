from datetime import timedelta

import pytest
from sqlalchemy import func, select

from app.core.db import new_session, utcnow
from app.models import ActionRequest, Interview
from app.models.enums import ActionStatus
from app.services import executor


@pytest.fixture
def setup(api):
    api.signup()
    ws = api.workspace()
    exp = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "use_case": "problem_discovery",
            "title": "Interview clinics",
            "hypothesis": "Clinics reconcile claims by hand.",
        },
    ).json()
    path = f"/api/workspaces/{ws}/experiments/{exp['id']}"
    prospects = [
        api.post(path + "/prospects", {"name": name, "email": f"{name.lower()}@example.com"}).json()
        for name in ("Dana", "Sam")
    ]
    body = {
        "prospect_ids": [p["id"] for p in prospects],
        "subject": "Research interview invitation",
        "invitation": "Would you share how you reconcile claims today?",
        "timezone": "Asia/Kolkata",
        "deadline": (utcnow() + timedelta(days=7)).isoformat(),
        "window": "Weekdays 2–5pm",
        "duration_minutes": 30,
        "max_followups": 1,
    }
    return path, prospects, body


def test_requests_are_atomic_bounded_and_require_individual_approval(api, setup, other):
    path, prospects, body = setup
    assert other.post(path + "/concierge", body).status_code == 404
    response = api.post(path + "/concierge", body)
    assert response.status_code == 201, response.text
    rows = response.json()
    assert len(rows) == 2 and all(a["status"] == "PENDING_APPROVAL" for a in rows)
    assert all(a["started_at"] is None for a in rows)
    assert api.post(path + "/concierge", body).status_code == 409
    with new_session() as db:
        assert db.scalar(select(func.count(Interview.id))) == 0
    action = rows[0]
    assert other.get(path + f"/actions/{action['id']}/conversation").status_code == 404
    approved = api.post(path + f"/actions/{action['id']}/decision", {"decision": "approve"})
    assert approved.status_code == 200
    events = api.get(path + f"/actions/{action['id']}/conversation").json()
    assert events[0]["state"] == "complete" and "[DEMO]" in events[0]["summary"]


@pytest.mark.parametrize(
    "change", ["duplicate", "too_many", "expired", "far_future", "timezone", "reminders"]
)
def test_invalid_coordination_is_rejected(api, setup, change):
    path, prospects, body = setup
    changes = {
        "duplicate": {"prospect_ids": [prospects[0]["id"]] * 2},
        "too_many": {"prospect_ids": [prospects[0]["id"]] * 6},
        "expired": {"deadline": (utcnow() - timedelta(days=1)).isoformat()},
        "far_future": {"deadline": (utcnow() + timedelta(days=15)).isoformat()},
        "timezone": {"timezone": "Not/A_Zone"},
        "reminders": {"max_followups": 2},
    }
    assert api.post(path + "/concierge", body | changes[change]).status_code == 422
    assert api.get(path + "/actions").json() == []


def test_batch_with_invalid_prospect_does_not_partially_save(api, setup):
    import uuid

    path, prospects, body = setup
    body["prospect_ids"] = [prospects[0]["id"], str(uuid.uuid4())]
    assert api.post(path + "/concierge", body).status_code == 404
    assert api.get(path + "/actions").json() == []


def test_expired_queued_task_never_reaches_provider(api, setup, monkeypatch):
    path, _, body = setup
    action = api.post(path + "/concierge", body).json()[0]
    with new_session() as db:
        row = db.get(ActionRequest, action["id"])
        payload = dict(row.payload)
        payload["coordination"] = dict(
            payload["coordination"], deadline=(utcnow() - timedelta(days=1)).isoformat()
        )
        row.payload, row.status = payload, ActionStatus.QUEUED
        db.commit()
    monkeypatch.setattr(executor, "get_adapter", lambda *a, **kw: pytest.fail("Expired task reached Fo"))
    executor.execute(action["id"])
    result = api.get(path + "/actions").json()
    failed = next(a for a in result if a["id"] == action["id"])
    assert failed["status"] == "FAILED" and "deadline" in failed["error"]
