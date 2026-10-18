import pytest

EXP = {
    "use_case": "problem_discovery",
    "title": "Clinic claims reconciliation",
    "hypothesis": "Clinic managers reconcile insurance claims by hand every week.",
    "target_audience": "Independent clinics, 5-30 staff",
    "criteria": [{"metric": "interviews_completed", "comparator": ">=", "target": 5}],
}


@pytest.fixture
def ws(api):
    api.signup()
    return api.workspace()


def _create(api, ws, **over):
    r = api.post(f"/api/workspaces/{ws}/experiments", {**EXP, **over})
    assert r.status_code == 201, r.text
    return r.json()


def test_use_case_templates_cover_six_workflows(api):
    ucs = {t["use_case"] for t in api.get("/api/use-cases").json()}
    assert len(ucs) == 6


def test_create_and_get_experiment(api, ws):
    exp = _create(api, ws)
    assert exp["stage"] == "hypothesis" and exp["is_demo"] is False
    assert exp["criteria"][0]["metric"] == "interviews_completed"
    assert [s["state"] for s in exp["stages"]][:2] == ["current", "upcoming"]
    got = api.get(f"/api/workspaces/{ws}/experiments/{exp['id']}").json()
    assert got["title"] == EXP["title"]


def test_invalid_experiment_rejected(api, ws):
    r = api.post(f"/api/workspaces/{ws}/experiments", {**EXP, "use_case": "nope", "hypothesis": "short"})
    assert r.status_code == 422
    bad_metric = {**EXP, "criteria": [{"metric": "DROP TABLE x;", "target": 1}]}
    assert api.post(f"/api/workspaces/{ws}/experiments", bad_metric).status_code == 422


def test_transition_rules(api, ws):
    exp = _create(api, ws)
    url = f"/api/workspaces/{ws}/experiments/{exp['id']}/transition"
    skip = api.post(url, {"to": "design"})
    assert skip.status_code == 400 and skip.json()["error"]["code"] == "transition_blocked"
    assert api.post(url, {"to": "research"}).json()["stage"] == "research"
    blocked = api.post(url, {"to": "evidence"})
    assert "evidence" in blocked.json()["error"]["message"].lower()
    assert api.post(url, {"to": "hypothesis"}).json()["stage"] == "hypothesis"  # back is allowed


def test_timeline_records_changes(api, ws):
    exp = _create(api, ws)
    base = f"/api/workspaces/{ws}/experiments/{exp['id']}"
    api.patch(base, {"title": "Renamed experiment"})
    api.post(f"{base}/transition", {"to": "research"})
    actions = [t["action"] for t in api.get(f"{base}/timeline").json()]
    assert actions == ["experiment.stage", "experiment.update", "experiment.create"]


def test_criteria_crud(api, ws):
    exp = _create(api, ws, criteria=[])
    base = f"/api/workspaces/{ws}/experiments/{exp['id']}"
    c = api.post(f"{base}/criteria", {"metric": "commitments", "target": 3}).json()
    assert api.get(base).json()["criteria"][0]["id"] == c["id"]
    assert api.delete(f"{base}/criteria/{c['id']}").status_code == 204
    assert api.get(base).json()["criteria"] == []


def test_archive_hides_experiment(api, ws):
    exp = _create(api, ws)
    assert api.post(f"/api/workspaces/{ws}/experiments/{exp['id']}/archive").status_code == 204
    assert api.get(f"/api/workspaces/{ws}/experiments").json() == []
    assert len(api.get(f"/api/workspaces/{ws}/experiments?include_archived=true").json()) == 1


def test_cross_tenant_experiment_access_denied(api, ws, other):
    exp = _create(api, ws)
    other_ws = other.workspace("Intruder Co")
    # Wrong workspace in path, and the attacker's own workspace with a foreign experiment id
    for url in (
        f"/api/workspaces/{ws}/experiments/{exp['id']}",
        f"/api/workspaces/{other_ws}/experiments/{exp['id']}",
    ):
        assert other.get(url).status_code == 404
        assert other.patch(url, {"title": "pwned title"}).status_code == 404
        assert other.post(f"{url}/transition", {"to": "research"}).status_code == 404
    assert other.get(f"/api/workspaces/{other_ws}/experiments").json() == []
