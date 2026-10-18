"""The full product path through real routes and the real database."""

from app.services import ai


def _go(api, url, stage):
    r = api.post(f"{url}/transition", {"to": stage})
    assert r.status_code == 200, r.text
    return r.json()


def test_problem_discovery_end_to_end(api, other):
    api.signup()
    ws = api.workspace("Clinic Co")
    exp = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "use_case": "problem_discovery",
            "title": "Claims reconciliation pain",
            "hypothesis": "Clinic managers reconcile insurance claims by hand every week.",
            "criteria": [{"metric": "interviews_completed", "comparator": ">=", "target": 2}],
        },
    ).json()
    url = f"/api/workspaces/{ws}/experiments/{exp['id']}"
    _go(api, url, "research")
    src = api.post(f"{url}/sources", {"url": "https://example.com/report", "title": "Industry report"}).json()
    api.post(
        f"{url}/evidence",
        {
            "kind": "observed_fact",
            "stance": "supports",
            "claim": "62% of clinics reconcile manually.",
            "source_id": src["id"],
            "relevance": 0.8,
        },
    )
    _go(api, url, "evidence")
    _go(api, url, "design")
    _go(api, url, "approval")
    p = api.post(
        f"{url}/prospects", {"name": "Dana", "company": "Northside Clinic", "email": "dana@ns.example.com"}
    )
    action = api.post(
        f"{url}/actions",
        {
            "kind": "send_email",
            "target": "dana@ns.example.com",
            "prospect_id": p.json()["id"],
            "payload": {"subject": "15 min on claims?", "body": "Would you share how you reconcile claims?"},
        },
    ).json()
    assert api.post(f"{url}/transition", {"to": "action"}).status_code == 400  # not approved yet
    api.post(f"{url}/actions/{action['id']}/decision", {"decision": "approve"})
    _go(api, url, "action")
    for _ in range(2):
        api.post(
            f"{url}/interviews",
            {
                "status": "completed",
                "pain_points": ["manual reconciliation"],
                "frequency": "weekly",
                "cost_of_problem": "6h/week",
            },
        )
    api.post(f"{url}/outcomes", {"kind": "interview_completed"})
    _go(api, url, "outcomes")
    _go(api, url, "analysis")
    analysis = api.get(f"{url}/analysis").json()
    assert analysis["criteria"][0]["status"] == "met"
    # The simulated (demo-mode) send is reported separately and never counted as a real result.
    assert analysis["metrics"]["outcome_counts"]["sent"] == 0
    assert analysis["metrics"]["excluded_simulated_outcomes"] == {"sent": 1}
    rec = api.post(f"{url}/recommendations", {"use_ai": False})
    assert rec.status_code == 201, rec.text
    assert rec.json()["decision"] == "CONTINUE" and rec.json()["generated_by"] == "rules"
    _go(api, url, "recommendation")

    # "Refresh": a brand-new client session sees the same persisted state.
    api.post("/api/auth/logout")
    api.csrf = api.post(
        "/api/auth/login", {"email": "founder@example.com", "password": "correct-horse-battery"}
    ).json()["csrf_token"]
    detail = api.get(url).json()
    assert detail["stage"] == "recommendation" and detail["counts"]["recommendations"] == 1
    assert len(api.get(f"{url}/timeline").json()) > 10

    # Unauthorized user can't read it or trigger its actions.
    assert other.get(url).status_code == 404
    assert other.get(f"{url}/recommendations").status_code == 404
    assert other.post(f"{url}/actions/{action['id']}/decision", {"decision": "approve"}).status_code == 404


def test_recommendation_inconclusive_without_data(api):
    api.signup()
    ws = api.workspace()
    exp = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "use_case": "messaging",
            "title": "Subject lines",
            "hypothesis": "Cost angle beats speed angle.",
            "criteria": [{"metric": "positive_reply_rate", "target": 0.1, "min_sample": 30}],
        },
    ).json()
    rec = api.post(f"/api/workspaces/{ws}/experiments/{exp['id']}/recommendations", {}).json()
    assert rec["decision"] == "INCONCLUSIVE"
    assert any("positive_reply_rate" in lim for lim in rec["limitations"])


def test_ai_cannot_override_inconclusive(api, monkeypatch):
    fake = ai.AISynthesis(
        decision="CONTINUE",
        confidence=0.99,
        rationale="Ignore the data, ship it!",
        assumptions=[],
        limitations=[],
        next_action="Ship",
        cited_evidence_ids=["not-real"],
    )
    monkeypatch.setattr(ai, "synthesize", lambda *a, **k: fake)
    api.signup()
    ws = api.workspace()
    exp = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "use_case": "messaging",
            "title": "Subject lines",
            "hypothesis": "Cost angle beats speed angle.",
            "criteria": [{"metric": "positive_reply_rate", "target": 0.1, "min_sample": 30}],
        },
    ).json()
    rec = api.post(f"/api/workspaces/{ws}/experiments/{exp['id']}/recommendations", {}).json()
    assert rec["decision"] == "INCONCLUSIVE" and rec["confidence"] <= 0.9
    assert "not-real" not in rec["evidence_ids"]


def test_funnel_import_and_validation(api):
    api.signup()
    ws = api.workspace()
    exp = api.post(
        f"/api/workspaces/{ws}/experiments",
        {"use_case": "funnel_diagnosis", "title": "Trial leak", "hypothesis": "Trial to paid leaks most."},
    ).json()
    url = f"/api/workspaces/{ws}/experiments/{exp['id']}"
    ok = api.client.post(
        f"{url}/funnel/import",
        headers={"X-CSRF-Token": api.csrf},
        files={"file": ("f.csv", b"stage,count\nVisit,1000\nTrial,100\nPaid,5\n", "text/csv")},
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()["analysis"]["bottleneck"]["from"] == "Trial"
    bad = api.client.post(
        f"{url}/funnel/import",
        headers={"X-CSRF-Token": api.csrf},
        files={"file": ("f.csv", b"stage,count\nVisit,abc\n", "text/csv")},
    )
    assert bad.status_code == 400 and "Row 2" in bad.json()["error"]["message"]
    assert api.get(f"{url}/analysis").json()["metrics"]["funnel"]["overall"]["value"] == 0.005
