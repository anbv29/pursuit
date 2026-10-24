"""Evidence expansion stays bounded and never fabricates market coverage."""

from types import SimpleNamespace

import pytest

from app.services import fetcher, report_research, research_sources
from app.services.research_rigor import coverage

pytestmark = pytest.mark.no_database


def test_crawl_prioritizes_supplied_roots_and_diverse_pages(monkeypatch):
    calls = []

    def fetch(url, **kwargs):
        calls.append(url)
        links = ["/product/a", "/product/b", "/pricing", "/customers/story", "/docs/start"]
        return fetcher.Fetched(url, "Page", url + " useful evidence" * 500, url, links)

    monkeypatch.setattr(fetcher, "fetch", fetch)
    sources = research_sources.collect(
        "https://company.example",
        {
            "known_competitors": "https://rival.example",
        },
    )
    assert calls[:2] == ["https://company.example", "https://rival.example"]
    assert "https://company.example/pricing" in calls
    assert "https://company.example/customers/story" in calls
    assert len(sources) <= 12 and len(calls) <= 18
    assert all(len(s["excerpt"]) == 6000 for s in sources)
    assert {s["source_role"] for s in sources} == {"company", "supplied_competitor"}


def test_crawl_deduplicates_content_and_rejects_untrusted_links(monkeypatch):
    calls = []

    def fetch(url, **kwargs):
        calls.append(url)
        return fetcher.Fetched(
            url,
            "Page",
            "Same public text." * 20,
            "same-hash",
            [
                "/pricing",
                "https://unrequested.example/pricing",
                "/checkout/pricing",
                "/docs/start?delete=true",
                "/docs/start#section",
            ],
        )

    monkeypatch.setattr(fetcher, "fetch", fetch)
    sources = research_sources.collect("https://company.example", {})
    assert len(sources) == 1
    assert calls == ["https://company.example", "https://company.example/pricing"]


def test_crawl_stops_at_wall_clock_budget(monkeypatch):
    clock = iter([0, 46])
    monkeypatch.setattr(research_sources.time, "monotonic", lambda: next(clock))
    monkeypatch.setattr(fetcher, "fetch", lambda *a, **k: pytest.fail("Fetch exceeded budget"))
    assert research_sources.collect("https://company.example", {}) == []


def test_coverage_does_not_confuse_sources_with_validation():
    result = coverage(
        [
            {"url": "https://company.example", "excerpt": "Claim", "source_role": "company"},
            {"url": "https://rival.example", "excerpt": "", "retrieval_status": "unavailable"},
        ]
    )
    assert result["usable_pages"] == 1
    assert result["missing_pages"] == ["https://rival.example"]
    assert "No general web search was performed." in result["limitations"]


def test_pass_persists_sources_and_reuses_them_on_resume(monkeypatch):
    fetches, saved, requests = [], [], []
    sources = [{"id": "S1", "url": "https://company.example", "excerpt": "Public evidence"}]
    monkeypatch.setattr(research_sources, "collect", lambda *a: fetches.append(a) or sources)
    monkeypatch.setattr(report_research, "_client", lambda: object())

    def parse(*args, **kwargs):
        requests.append(kwargs)
        return SimpleNamespace(parsed_output=SimpleNamespace(notes="Grounded notes with uncertainty."))

    monkeypatch.setattr(report_research.ai_usage, "parse", parse)
    with report_research.checkpoints({}, lambda state: saved.append(dict(state))):
        report_research.research_pass("https://company.example", "Text", {}, lambda _: None, "Who buys?")
    with report_research.checkpoints(saved[-1], lambda _: None):
        report_research.research_pass("https://company.example", "Text", {}, lambda _: None, "Why switch?")
    assert len(fetches) == 1 and len(requests) == 2
    assert "source_coverage" in requests[0]["messages"][0]["content"]
    assert "Disconfirmation" in requests[0]["system"]
