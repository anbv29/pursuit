# ruff: noqa: F811
from types import SimpleNamespace

from app.services import prospect_discovery as discovery
from tests.test_reports import BODY, ai_on, fake_ai, ws  # noqa: F401


def test_discovery_requires_sources_checks_sites_and_deduplicates(api, ws, fake_ai, monkeypatch, other):
    rid = api.post(f"/api/workspaces/{ws}/reports", BODY).json()["id"]
    found = SimpleNamespace(
        notes="Public organizations",
        sources=[
            {
                "id": "S1",
                "url": "https://candidate.example.com",
                "title": "Candidate",
                "via": "fixture",
            }
        ],
    )
    monkeypatch.setattr(discovery.report_research, "research", lambda *a, **kw: found)
    monkeypatch.setattr(discovery.anthropic, "Anthropic", lambda **kw: object())
    candidates = discovery.Candidates(
        companies=[
            discovery.Candidate(
                company="Candidate",
                website="https://candidate.example.com",
                rationale="Possible fit",
                source_ids=["S1"],
            ),
            discovery.Candidate(
                company="Invented",
                website="https://invented.example.com",
                rationale="No source",
                source_ids=["fake"],
            ),
        ]
    )
    monkeypatch.setattr(
        discovery.ai_usage, "parse", lambda *a, **kw: SimpleNamespace(parsed_output=candidates)
    )
    fetched = []

    def fetch(url):
        fetched.append(url)
        return SimpleNamespace(url=url, title="Candidate official site")

    monkeypatch.setattr(discovery.fetcher, "fetch", fetch)
    path = f"/api/workspaces/{ws}/reports/{rid}/prospects"
    assert other.post(path + "/discover").status_code == 404
    first = api.post(path + "/discover")
    assert first.status_code == 200, first.text
    assert len(first.json()) == 1
    assert first.json()[0]["payload"]["verification"] == "public_website_reachable"
    assert "not verified" in first.json()[0]["payload"]["note"]
    assert len(api.post(path + "/discover").json()) == 1
    assert all("candidate.example.com" in url for url in fetched)
