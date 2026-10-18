import pytest


@pytest.fixture
def exp_url(api):
    api.signup()
    ws = api.workspace()
    r = api.post(
        f"/api/workspaces/{ws}/experiments",
        {
            "use_case": "competitive_research",
            "title": "Agency tooling landscape",
            "hypothesis": "No competitor targets small agencies with usage pricing.",
        },
    )
    return f"/api/workspaces/{ws}/experiments/{r.json()['id']}"


def test_source_and_evidence_provenance(api, exp_url):
    src = api.post(
        f"{exp_url}/sources", {"url": "https://example.com/pricing", "title": "Pricing", "excerpt": "Pro $49"}
    ).json()
    assert src["origin"] == "manual" and src["retrieved_at"]
    ev = api.post(
        f"{exp_url}/evidence",
        {
            "kind": "observed_fact",
            "stance": "contradicts",
            "claim": "Acme offers usage pricing.",
            "relevance": 0.9,
            "source_id": src["id"],
        },
    )
    assert ev.status_code == 201, ev.text
    body = ev.json()
    assert body["source"]["url"] == "https://example.com/pricing"
    assert body["stance"] == "contradicts"
    listed = api.get(f"{exp_url}/evidence").json()
    assert [e["id"] for e in listed] == [body["id"]]


def test_evidence_validation(api, exp_url):
    bad = {"kind": "rumour", "claim": "x", "relevance": 3}
    assert api.post(f"{exp_url}/evidence", bad).status_code == 422
    assert api.post(f"{exp_url}/sources", {"url": "javascript:alert(1)"}).status_code == 422


def test_fetch_blocks_ssrf_via_api(api, exp_url):
    r = api.post(f"{exp_url}/sources/fetch", {"url": "http://169.254.169.254/latest/meta-data/"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "fetch_failed"


def test_cannot_link_foreign_source(api, exp_url, other):
    ows = other.workspace("Other")
    oexp = other.post(
        f"/api/workspaces/{ows}/experiments",
        {"use_case": "messaging", "title": "Other exp", "hypothesis": "Some hypothesis text here."},
    ).json()
    osrc = other.post(
        f"/api/workspaces/{ows}/experiments/{oexp['id']}/sources", {"url": "https://example.org"}
    ).json()
    r = api.post(f"{exp_url}/evidence", {"kind": "assumption", "claim": "Linked!", "source_id": osrc["id"]})
    assert r.status_code == 404
    assert other.get(f"{exp_url}/evidence").status_code == 404


def test_evidence_unlocks_stage(api, exp_url):
    api.post(f"{exp_url}/transition", {"to": "research"})
    api.post(f"{exp_url}/evidence", {"kind": "interpretation", "claim": "Market looks crowded."})
    assert api.post(f"{exp_url}/transition", {"to": "evidence"}).json()["stage"] == "evidence"
