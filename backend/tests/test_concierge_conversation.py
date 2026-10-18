# ruff: noqa: F811
import pytest
from sqlalchemy import func, select

from app.adapters.fo.base import FoResult
from app.core.db import new_session, utcnow
from app.models import ActionRequest, Interview, OutcomeEvent
from app.models.enums import DataOrigin
from app.services import executor, fo_conversation
from tests.test_concierge import setup  # noqa: F401


class FakeFo:
    def __init__(self):
        self.replies = []
        self.polls = []

    def submit(self, instruction, key):
        assert "at most 1" in instruction and "48 hours" in instruction
        return FoResult(state="needs_input", summary="Which day works best?", conversation_ref="owned-task")

    def reply(self, instruction, ref):
        self.replies.append((instruction, ref))
        return FoResult(state="complete", summary="A time was proposed.", conversation_ref=ref)

    def poll(self, ref):
        self.polls.append(ref)
        return FoResult(state="needs_input", summary="Which day works best?", conversation_ref=ref)


@pytest.mark.parametrize("mode", ["demo", "live"])
def test_history_clarification_and_booking_are_scoped_and_honest(api, setup, monkeypatch, other, mode):
    path, _, body = setup
    action = api.post(path + "/concierge", body).json()[0]
    with new_session() as db:
        db.get(ActionRequest, action["id"]).mode = mode
        db.commit()
    fo = FakeFo()
    monkeypatch.setattr(executor, "get_adapter", lambda *a, **kw: fo)
    monkeypatch.setattr(fo_conversation, "get_adapter", lambda *a, **kw: fo)
    task = path + f"/actions/{action['id']}"
    assert api.post(task + "/decision", {"decision": "approve"}).status_code == 200
    assert other.post(task + "/reply", {"message": "Tuesday works"}).status_code == 404
    assert api.post(task + "/check").json()["fo_state"] == "needs_input"
    response = api.post(task + "/reply", {"message": "Tuesday works", "conversationId": "foreign-task"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "UNKNOWN"
    assert fo.replies[0][1] == "owned-task" and fo.polls == ["owned-task"]
    assert "Do not resend" in fo.replies[0][0]
    assert api.post(task + "/reply", {"message": "Tuesday works"}).status_code == 409
    events = api.get(task + "/conversation").json()
    assert any(e["state"] == "reply_approved" and e["summary"] == "Tuesday works" for e in events)
    with new_session() as db:
        assert db.scalar(select(func.count(Interview.id))) == 0
    assert api.post(task + "/interview-result", {"result": "booked"}).status_code == 422
    result = {"result": "booked", "scheduled_at": utcnow().isoformat(), "note": "Checked calendar"}
    assert api.post(task + "/interview-result", result).status_code == 200
    assert api.post(task + "/interview-result", result).status_code == 409
    with new_session() as db:
        interview = db.scalar(select(Interview))
        assert interview.status == "planned"
        assert interview.origin == (DataOrigin.DEMO if mode == "demo" else DataOrigin.MANUAL)
        assert db.scalar(select(func.count(OutcomeEvent.id))) == 1


def test_members_cannot_see_contacts_or_control_concierge(api, setup, other):
    path, _, body = setup
    ws = path.split("/")[3]
    action = api.post(path + "/concierge", body).json()[0]
    api.post(f"/api/workspaces/{ws}/members", {"email": "intruder@example.com"})
    assert other.get(path + "/actions").json() == []
    assert other.get(f"/api/workspaces/{ws}/approvals").json() == []
    assert other.get(path + f"/actions/{action['id']}/conversation").status_code == 403
    assert other.post(path + f"/actions/{action['id']}/decision", {"decision": "approve"}).status_code == 403
    assert other.post(path + f"/actions/{action['id']}/decision", {"decision": "reject"}).status_code == 403
    assert other.post(path + f"/actions/{action['id']}/cancel").status_code == 403
