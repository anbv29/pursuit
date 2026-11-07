from app.core.db import new_session
from app.models import Report
from tests import test_reports as fixtures

ai_on, fake_ai, ws = fixtures.ai_on, fixtures.fake_ai, fixtures.ws


def test_only_finished_research_unlocks_workspace_workflows(api, ws, fake_ai, other):
    path = f"/api/workspaces/{ws}"
    assert api.get(path).json()["has_finished_report"] is False
    rid = api.post(path + "/reports", fixtures.BODY).json()["id"]
    assert api.get(path).json()["has_finished_report"] is True
    assert other.get(path).status_code == 404
    for status in ["QUEUED", "RUNNING", "FAILED", "CANCELLED"]:
        with new_session() as db:
            db.get(Report, rid).status = status
            db.commit()
        assert api.get(path).json()["has_finished_report"] is False
