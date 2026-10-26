import copy

import pytest

from app.schemas.research import DecisionBrief, ResearchPlan
from app.services import deep_research, fetcher, report_research

pytestmark = pytest.mark.no_database


def insight(**changes):
    data = dict(
        title="Budget owner differs from user",
        finding="The buyer may be an operations lead.",
        reasoning="The public page describes a repeated team approval problem.",
        implication="Test approval delays with team leads before individual users.",
        counterargument="The team may tolerate delays rather than pay to remove them.",
        next_test="Ask five leads about their last delayed approval and existing spending.",
        decision_if_supported="Focus interviews on team leads.",
        decision_if_rejected="Investigate the individual workflow instead.",
        evidence=[{"source_id": "S1", "quote": "Approvals take three days."}],
        confidence="high",
        status="interpretation",
        limitations=[],
    )
    return dict(data, **changes)


def test_quotes_are_verified_and_invalid_evidence_becomes_a_hypothesis():
    brief = DecisionBrief(
        insights=[insight(), insight(evidence=[{"source_id": "fake", "quote": "Invented quote."}])]
    )
    result = deep_research.verify_brief(
        brief, [{"id": "S1", "url": "https://example.com", "excerpt": "Approvals take three days."}]
    )
    assert result[0]["evidence"] and result[0]["confidence"] == "low"
    assert result[1]["evidence"] == [] and result[1]["status"] == "hypothesis"
    assert result[1]["confidence"] == "low"


def test_multiple_pages_from_one_publisher_do_not_create_high_confidence():
    evidence = [{"source_id": s, "quote": "Approvals take three days."} for s in ["S1", "S2"]]
    sources = [
        {"id": s, "url": f"https://example.com/{s}", "excerpt": "Approvals take three days."}
        for s in ["S1", "S2"]
    ]
    result = deep_research.verify_brief(DecisionBrief(insights=[insight(evidence=evidence)]), sources)
    assert result[0]["confidence"] == "low"


def test_a_matching_quote_does_not_promote_a_hypothesis_to_a_demonstrated_finding():
    result = deep_research.verify_brief(
        DecisionBrief(insights=[insight(status="hypothesis")]),
        [{"id": "S1", "url": "https://example.com", "excerpt": "Approvals take three days."}],
    )
    assert result[0]["status"] == "hypothesis" and result[0]["confidence"] == "low"


def setup_provider(monkeypatch):
    calls = []
    monkeypatch.setattr(report_research, "_client", lambda: object())

    def structured(client, schema, instruction, data, tokens):
        calls.append(schema.__name__)
        if schema is ResearchPlan:
            return ResearchPlan(
                customer_question="Who pays for delays?",
                market_question="Which alternative wins?",
                challenge_question="Why would nobody switch?",
            )
        return DecisionBrief(insights=[insight()])

    def research(*args):
        calls.append("search")
        assert "untrusted" in args[-1]
        return report_research.Research(
            "Observed notes; do not assume demand.",
            [{"id": "old", "url": "https://example.com/pricing", "title": "Price", "via": "web_search"}],
        )

    monkeypatch.setattr(deep_research, "structured", structured)
    monkeypatch.setattr(report_research, "research_pass", research)
    monkeypatch.setattr(
        fetcher, "fetch", lambda url: fetcher.Fetched(url, "Price", "Approvals take three days.", "hash")
    )
    return calls


def test_three_focused_passes_deduplicate_sources_and_resume_without_provider_calls(monkeypatch):
    calls = setup_provider(monkeypatch)
    saved = []
    with report_research.checkpoints({}, lambda s: saved.append(copy.deepcopy(s))):
        result = report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert calls.count("search") == 3 and len(result.sources) == 2
    assert saved[-1]["passes_allocated"] == 3
    assert result.insights
    calls.clear()
    with report_research.checkpoints(saved[-1], lambda s: None):
        report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert calls == []


def test_source_fetch_failure_is_not_fabricated_evidence(monkeypatch):
    setup_provider(monkeypatch)
    monkeypatch.setattr(fetcher, "fetch", lambda url: (_ for _ in ()).throw(fetcher.FetchError("Blocked")))
    result = report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert result.sources[1]["retrieval_status"] == "unavailable"
    assert result.insights[0]["status"] == "hypothesis"


def test_interrupted_pass_resumes_completed_work_and_never_exceeds_pass_allocation(monkeypatch):
    calls = setup_provider(monkeypatch)
    original = report_research.research_pass
    saved = []

    def interrupted(*args):
        if calls.count("search") == 1:
            raise report_research.ResearchError("Provider interrupted")
        return original(*args)

    monkeypatch.setattr(report_research, "research_pass", interrupted)
    with (
        report_research.checkpoints({}, lambda s: saved.append(copy.deepcopy(s))),
        pytest.raises(report_research.ResearchError),
    ):
        report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert "customers" in saved[-1] and "market" not in saved[-1]
    monkeypatch.setattr(report_research, "research_pass", original)
    with report_research.checkpoints(saved[-1], lambda s: saved.append(copy.deepcopy(s))):
        report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert saved[-1]["passes_allocated"] == 4
    assert calls.count("search") == 3

    exhausted = copy.deepcopy(saved[-1])
    exhausted.pop("challenge")
    exhausted["passes_allocated"] = 6
    with (
        report_research.checkpoints(exhausted, lambda s: None),
        pytest.raises(report_research.ResearchError, match="pass limit"),
    ):
        report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert calls.count("search") == 3


def test_cancellation_stops_before_provider_work(monkeypatch):
    calls = setup_provider(monkeypatch)

    def cancelled(_):
        raise RuntimeError("Job cancelled")

    with pytest.raises(RuntimeError, match="cancelled"):
        report_research.research("https://company.example", "Company page", {}, cancelled)
    assert calls == []


def test_new_reports_downgrade_facts_without_matching_source_excerpts():
    from app.services.report_validate import validate
    from tests.test_report_validate import sample

    content = sample()
    sources = [{"id": "S1", "url": "https://example.com", "excerpt": "Pro is $49 per month."}]
    result, stats = validate(content, sources)
    assert result["snapshot"]["observed_pricing"][0]["kind"] == "interpretation"
    content.snapshot.observed_pricing[0].supporting_quote = "Pro is $49 per month."
    content.snapshot.observed_pricing[0].text = "Pro is $49 per month."
    result, _ = validate(content, sources)
    assert result["snapshot"]["observed_pricing"][0]["kind"] == "fact"
    assert stats["downgraded_facts"] == 3


def test_synthesis_reuses_saved_parts_and_invalidates_them_when_evidence_changes(monkeypatch):
    from tests.test_report_validate import sample

    monkeypatch.setattr(report_research, "_client", lambda: object())
    calls = []

    def part(client, model, context, schema, instruction):
        from app.schemas.report import PartGTM
        from tests.test_gtm_strategy import strategy

        calls.append(schema.__name__)
        if schema is PartGTM:
            return PartGTM(gtm_strategy=strategy())
        return schema.model_validate(sample().model_dump())

    monkeypatch.setattr(report_research, "_synthesize_part", part)
    saved = []
    found = report_research.Research("Research notes", [])
    with report_research.checkpoints({}, lambda s: saved.append(copy.deepcopy(s))):
        report_research.synthesize("https://example.com", "Public page", {}, found)
    assert len(calls) == 4
    calls.clear()
    with report_research.checkpoints(saved[-1], lambda s: None):
        report_research.synthesize("https://example.com", "Public page", {}, found)
    assert calls == []
    found.notes = "Updated evidence changes the context"
    with report_research.checkpoints(saved[-1], lambda s: None):
        report_research.synthesize("https://example.com", "Public page", {}, found)
    assert len(calls) == 4


def test_free_source_collection_is_same_origin_bounded_and_tolerates_missing_pages(monkeypatch):
    from app.services.preview_sources import collect

    page = fetcher.Fetched(
        "https://example.com",
        "Site",
        "Company content",
        "hash",
        [
            "/about",
            "https://private.example/pricing",
            "/pricing?token=secret",
            "/product",
            "/customers",
        ],
    )
    calls = []

    def fetch(url, **kwargs):
        calls.append(url)
        if url.endswith("about"):
            raise fetcher.FetchError("Missing")
        return fetcher.Fetched(
            url, "Product", "A product page describing real features and workflows.", "hash"
        )

    monkeypatch.setattr(fetcher, "fetch", fetch)
    gathered, sources = collect(page)
    assert calls == [
        "https://example.com/customers",
        "https://example.com/product",
        "https://example.com/about",
    ]
    assert len(sources) == 3 and "real features" in gathered.text


@pytest.mark.parametrize("excerpt", ["Frozen evidence from the research pass.", ""])
def test_explicit_snapshots_are_never_refetched(monkeypatch, excerpt):
    setup_provider(monkeypatch)

    def research(*args):
        return report_research.Research(
            "Notes",
            [
                {
                    "id": "old",
                    "url": "https://example.com/pricing",
                    "excerpt": excerpt,
                    "retrieval_status": "available" if excerpt else "unavailable",
                    "sha256": "frozen",
                }
            ],
        )

    monkeypatch.setattr(report_research, "research_pass", research)
    monkeypatch.setattr(fetcher, "fetch", lambda *a, **k: pytest.fail("Snapshot was refetched"))
    result = report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert result.sources[1]["excerpt"] == excerpt
    assert result.sources[1]["sha256"] == "frozen"


def test_legacy_fetch_retains_final_url(monkeypatch):
    setup_provider(monkeypatch)
    calls = []

    def fetch(url):
        calls.append(url)
        return fetcher.Fetched("https://example.com/final", "Final", "Approvals take three days.", "hash")

    monkeypatch.setattr(fetcher, "fetch", fetch)
    result = report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert calls == ["https://example.com/pricing"]
    assert result.sources[1]["url"] == "https://example.com/final"


def test_different_hosts_do_not_establish_confidence():
    sources = [
        {"id": str(i), "url": f"https://publisher{i}.example", "excerpt": "Approvals take three days."}
        for i in range(2)
    ]
    evidence = [{"source_id": str(i), "quote": "Approvals take three days."} for i in range(2)]
    result = deep_research.verify_brief(DecisionBrief(insights=[insight(evidence=evidence)]), sources)
    assert result[0]["confidence"] == "low"


def test_company_pass_snapshot_wins_over_preview_and_hash_duplicates(monkeypatch):
    setup_provider(monkeypatch)

    def research(*args):
        return report_research.Research(
            "Notes",
            [
                {
                    "id": "old",
                    "url": "https://company.example",
                    "excerpt": "Frozen company evidence.",
                    "sha256": "same",
                },
                {
                    "id": "alias",
                    "url": "https://mirror.example",
                    "excerpt": "Frozen company evidence.",
                    "sha256": "same",
                },
            ],
        )

    monkeypatch.setattr(report_research, "research_pass", research)
    monkeypatch.setattr(fetcher, "fetch", lambda *a, **k: pytest.fail("Snapshot was refetched"))
    result = report_research.research("https://company.example", "Older company preview", {}, lambda _: None)
    assert len(result.sources) == 1
    assert result.sources[0]["excerpt"] == "Frozen company evidence."


def test_snapshot_takes_precedence_over_legacy_record_for_same_url(monkeypatch):
    setup_provider(monkeypatch)
    calls = []

    def research(*args):
        source = {"id": "old", "url": "https://example.com/pricing"}
        if calls:
            source.update(excerpt="The frozen research excerpt.", sha256="snapshot")
        calls.append(True)
        return report_research.Research("Notes", [source])

    monkeypatch.setattr(report_research, "research_pass", research)
    monkeypatch.setattr(fetcher, "fetch", lambda *a, **k: pytest.fail("Existing snapshot was replaced"))
    result = report_research.research("https://company.example", "Company page", {}, lambda _: None)
    assert result.sources[1]["excerpt"] == "The frozen research excerpt."
