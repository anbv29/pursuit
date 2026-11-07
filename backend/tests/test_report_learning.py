from app.core.db import new_session
from app.models import Report
from tests import test_reports as fixtures

ai_on, fake_ai, ws = fixtures.ai_on, fixtures.fake_ai, fixtures.ws
BODY = fixtures.BODY


def test_learning_survives_refresh_and_stays_private(api, ws, fake_ai, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}"
    assert (
        api.post(path + "/learning", {"text": "Three interviews contradicted our pricing."}).status_code
        == 201
    )
    assert api.post(path + "/learning", {"text": "   "}).status_code == 422
    tasks = api.post(path + "/plan").json()
    updated = api.patch(
        path + f"/plan/{tasks[0]['id']}",
        {
            "done": False,
            "notes": "Buyer needs procurement approval",
        },
    ).json()
    preview = api.get(path + "/learning").json()
    assert preview["observations"][0]["origin"] == "founder_testimony"
    assert preview["tasks"][0]["done"] is False
    assert preview["tasks"][0]["recorded_at"] == updated["payload"]["updated_at"]
    assert other.get(path + "/learning").status_code == 404
    assert other.post(path + "/learning", {"text": "Foreign note"}).status_code == 404
    assert (
        api.post(
            path + "/refresh",
            {
                "sections": ["pricing"],
                "include_saved_learning": True,
            },
        ).status_code
        == 202
    )
    with new_session() as db:
        frozen = db.get(Report, rid).inputs["saved_learning"]
        assert frozen["tasks"][0]["text"] == "Buyer needs procurement approval"
    api.post(path + "/learning", {"text": "Later information"})
    with new_session() as db:
        assert db.get(Report, rid).inputs["saved_learning"] == frozen
    assert len(api.get(path + "/learning").json()["observations"]) == 2
    assert api.get(path + "/plan").json()[0]["id"] == tasks[0]["id"]


def test_learning_context_is_bounded_and_refresh_can_exclude_it(api, ws, fake_ai):
    import json

    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}"
    for _ in range(8):
        assert api.post(path + "/learning", {"text": "界" * 3000}).status_code == 201
    preview = api.get(path + "/learning").json()
    assert len(json.dumps(preview, ensure_ascii=False).encode()) <= 12000
    assert preview["omitted_items"] > 0
    assert all(item["shortened"] for item in preview["observations"])
    assert (
        api.post(
            path + "/refresh",
            {
                "sections": ["pricing"],
            },
        ).status_code
        == 202
    )
    with new_session() as db:
        assert "saved_learning" not in db.get(Report, rid).inputs


def test_learning_only_collects_linked_real_workspace_experiments(api, ws, fake_ai):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    path = f"/api/workspaces/{ws}/reports/{rid}"
    created = api.post(path + "/experiments/0")
    assert created.status_code == 201, created.text
    preview = api.get(path + "/learning").json()
    assert preview["experiments"][0]["id"] == created.json()["id"]
    assert preview["experiments"][0]["origin"] == "recorded_experiment_data"
    assert "criteria" in preview["experiments"][0]
