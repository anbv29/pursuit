from datetime import timedelta
from uuid import UUID

import pytest
from sqlalchemy import update

from app.core.db import new_session, utcnow
from app.models import AuditEvent, Experiment, OutcomeEvent
from app.models.enums import DataOrigin, OutcomeKind
from app.services.interview_capture import suggest


def setup_experiment(api, *, demo=False):
    api.signup()
    ws = api.post("/api/workspaces", {"name": "Workflow test", "with_demo_data": demo}).json()["id"]
    response = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "title": "Interview independent shop owners",
            "hypothesis": "Shop owners spend hours reconciling inventory manually.",
            "use_case": "problem_discovery",
            "criteria": [{"metric": "interviews_completed", "target": 5}],
        },
    )
    assert response.status_code == 201, response.text
    exp = response.json()["id"]
    return ws, exp, f"/api/workspaces/{ws}/experiments/{exp}"


@pytest.mark.no_database
def test_suggestions_are_literal_spans_not_questions_or_invented_commitments():
    text = (
        "Interviewer: Would you pay for a pilot?\n"
        "Owner: We waste hours doing this manually.\nBut we have no budget."
    )
    highlights = suggest(text)
    assert {h["category"] for h in highlights} == {"pain", "objection"}
    assert all(text[h["start_offset"] : h["end_offset"]] == h["quote"] for h in highlights)
    assert suggest("Everything works well. Nothing to report.") == []
    assert len(suggest("We waste hours.\n" * 1000)) == 20


def test_capture_review_preserves_provenance_and_does_not_inflate_interviews(api):
    ws, _, path = setup_experiment(api)
    text = "Owner: We waste hours reconciling stock manually.\r\nBut we have no budget for a subscription."
    result = api.post(path + "/interview-captures", {"title": "Owner interview", "transcript": text})
    assert result.status_code == 201, result.text
    capture = result.json()
    assert "\r" not in capture["transcript"]
    assert len(capture["highlights"]) == 2
    assert api.get(path + "/evidence").json() == []
    assert api.get(path + "/interviews").json() == []
    highlight = capture["highlights"][0]
    accept = f"{path}/interview-captures/{capture['id']}/highlights/{highlight['id']}/accept"
    reviewed = {"claim": "The owner reports time lost to manual reconciliation.", "stance": "supports"}
    first = api.post(accept, reviewed)
    assert first.status_code == 200, first.text
    assert api.post(accept, reviewed).json()["evidence_id"] == first.json()["evidence_id"]
    evidence = api.get(path + "/evidence").json()
    assert len(evidence) == 1
    assert evidence[0]["kind"] == "interpretation"
    assert evidence[0]["source"]["excerpt"] == highlight["quote"]
    assert "tab=interview-notes&capture=" in evidence[0]["source"]["url"]
    assert len(evidence[0]["source"]["content_sha256"]) == 64
    exported = api.get(f"/api/workspaces/{ws}/export").json()
    assert len(exported["interview_captures"]) == 1
    assert len(exported["interview_highlights"]) == 2
    assert api.delete(path + "/evidence/" + evidence[0]["id"]).status_code == 204
    refreshed = api.get(path + "/interview-captures/" + capture["id"]).json()
    assert refreshed["highlights"][0]["evidence_id"] is None


def test_manual_highlight_requires_exact_unicode_quote(api):
    _, _, path = setup_experiment(api)
    text = "Owner: café orders take three minutes.\nNo matching keywords in this second sentence."
    capture = api.post(path + "/interview-captures", {"title": "Café notes", "transcript": text}).json()
    endpoint = f"{path}/interview-captures/{capture['id']}/highlights"
    body = {"category": "other", "quote": "café orders", "start_offset": text.index("café")}
    result = api.post(endpoint, body)
    assert result.status_code == 201, result.text
    assert api.post(endpoint, body).json()["id"] == result.json()["id"]
    assert api.post(endpoint, {**body, "quote": "café orders are paid"}).status_code == 400
    assert api.post(endpoint, {**body, "start_offset": 99999}).status_code == 400


def test_capture_and_reminders_are_tenant_scoped_and_csrf_protected(api, other):
    ws, exp, path = setup_experiment(api)
    capture = api.post(
        path + "/interview-captures",
        {
            "title": "Private interview",
            "transcript": "We waste hours doing manual stock checks.",
        },
    ).json()
    assert other.get(path + "/interview-captures").status_code == 404
    assert other.get(f"{path}/interview-captures/{capture['id']}").status_code == 404
    assert other.get(f"/api/workspaces/{ws}/focus").status_code == 404
    body = {"experiment_id": exp, "title": "Follow up", "due_at": utcnow().isoformat()}
    reminder = api.post(f"/api/workspaces/{ws}/reminders", body).json()
    assert (
        other.patch(f"/api/workspaces/{ws}/reminders/{reminder['id']}", {"completed": True}).status_code
        == 404
    )
    assert api.client.post(f"/api/workspaces/{ws}/reminders", json=body).status_code == 403
    assert (
        api.post(f"/api/workspaces/{ws}/reminders", {**body, "due_at": "2026-11-01T12:00:00"}).status_code
        == 422
    )
    own_ws = other.workspace()
    assert other.post(f"/api/workspaces/{own_ws}/reminders", body).status_code == 404


def test_reminders_persist_complete_reopen_and_snooze(api):
    ws, exp, path = setup_experiment(api)
    endpoint = f"/api/workspaces/{ws}/reminders"
    response = api.post(
        endpoint,
        {
            "experiment_id": exp,
            "title": "Record interview outcomes",
            "due_at": (utcnow() - timedelta(days=1)).isoformat(),
        },
    )
    assert response.status_code == 201, response.text
    reminder = response.json()
    assert reminder["overdue"] is True
    focus = api.get(f"/api/workspaces/{ws}/focus").json()
    assert focus["overdue_count"] == 1
    assert focus["priorities"][0]["id"] == "reminder:" + reminder["id"]
    item = endpoint + "/" + reminder["id"]
    assert api.patch(item, {"completed": True}).json()["completed_at"]
    assert api.get(endpoint).json() == []
    assert len(api.get(endpoint + "?include_completed=true").json()) == 1
    reopened = api.patch(
        item, {"completed": False, "due_at": (utcnow() + timedelta(days=2)).isoformat()}
    ).json()
    assert reopened["overdue"] is False
    assert reopened["completed_at"] is None
    assert api.get(f"/api/workspaces/{ws}/focus").json()["overdue_count"] == 0
    assert api.post(path + "/archive").status_code == 204
    assert api.get(endpoint).json() == []


def test_priorities_explain_missing_evidence_then_new_results(api):
    ws, _, path = setup_experiment(api)
    endpoint = f"/api/workspaces/{ws}/focus"
    initial = api.get(endpoint).json()
    assert initial["priorities"][0]["title"] == "Add evidence before deciding"
    assert api.post(path + "/outcomes", {"kind": "interview_completed"}).status_code == 201
    updated = api.get(endpoint).json()
    assert updated["priorities"][0]["title"] == "Review newly recorded results"
    assert "newer than" in updated["priorities"][0]["reason"]
    assert len(updated["priorities"]) <= 5


def test_new_workspace_gets_an_actionable_starting_point(api):
    api.signup()
    ws = api.workspace()
    response = api.get(f"/api/workspaces/{ws}/focus")
    assert response.status_code == 200, response.text
    assert response.json()["priorities"][0]["href"].endswith("/reports/new")


def test_capture_in_demo_workspace_never_becomes_live_evidence(api):
    _, _, path = setup_experiment(api, demo=True)
    capture = api.post(
        path + "/interview-captures",
        {
            "title": "Demo notes",
            "transcript": "We waste hours on this manual process.",
        },
    ).json()
    highlight = capture["highlights"][0]
    response = api.post(
        f"{path}/interview-captures/{capture['id']}/highlights/{highlight['id']}/accept",
        {
            "claim": "A simulated participant reported manual work.",
        },
    )
    assert response.status_code == 200, response.text
    assert api.get(path + "/evidence").json()[0]["origin"] == "demo"


def test_priorities_ignore_simulation_and_notice_recent_activity(api):
    ws, exp, path = setup_experiment(api)
    assert (
        api.post(
            path + "/evidence",
            {
                "kind": "interpretation",
                "claim": "An owner described a recurring stock-check problem.",
            },
        ).status_code
        == 201
    )
    old = utcnow() - timedelta(days=10)
    with new_session() as db:
        db.execute(update(Experiment).where(Experiment.id == UUID(exp)).values(updated_at=old))
        db.execute(
            update(AuditEvent)
            .where(
                AuditEvent.workspace_id == UUID(ws),
                AuditEvent.target_type == "experiment",
                AuditEvent.target_id == exp,
            )
            .values(created_at=old)
        )
        db.add(
            OutcomeEvent(
                experiment_id=UUID(exp),
                kind=OutcomeKind.INTERVIEW_COMPLETED,
                origin=DataOrigin.DEMO,
            )
        )
        db.commit()
    focus = api.get(f"/api/workspaces/{ws}/focus").json()
    assert focus["priorities"][0]["title"] == "Check in on an inactive experiment"
    assert (
        api.post(
            path + "/interview-captures",
            {
                "title": "Fresh conversation",
                "transcript": "The owner described their current workflow in detail.",
            },
        ).status_code
        == 201
    )
    refreshed = api.get(f"/api/workspaces/{ws}/focus").json()
    assert not any(p["title"] == "Check in on an inactive experiment" for p in refreshed["priorities"])
