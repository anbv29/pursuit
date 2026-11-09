from types import SimpleNamespace

import pytest

from app.services.fetcher import Fetched
from app.services.watch_claims import claims_for, compare

pytestmark = pytest.mark.no_database


def report_fixture():
    return SimpleNamespace(
        content={
            "snapshot": {
                "observed_pricing": [
                    {
                        "text": "Pro costs $49 per month.",
                        "kind": "fact",
                        "source_ids": ["S1"],
                        "supporting_quote": "Pro costs $49 per month.",
                    }
                ]
            }
        },
        sources=[
            {
                "id": "S1",
                "url": "https://example.com/pricing",
                "title": "Pricing",
                "excerpt": "Pro costs $49 per month.",
                "retrieved_at": "2026-11-01T00:00:00Z",
            }
        ],
    )


def test_snapshots_have_stable_paths_and_do_not_rebind_reused_source_ids():
    report = report_fixture()
    before = claims_for(report)[0]
    assert before["id"] == "snapshot.observed_pricing.0"
    report.sources[0]["url"] = "https://different.example/pricing"
    after = claims_for(report)[0]
    assert before["fingerprint"] != after["fingerprint"]
    assert before["receipts"][0]["url"] == "https://example.com/pricing"


@pytest.mark.parametrize(
    "body",
    [
        "Pro costs $59 per month.",
        "Pro costs $49 per year.",
        "Pro costs $49 per month, billed annually.",
        "The pricing page moved.",
        "",
    ],
)
def test_changed_pricing_or_generic_changes_never_claim_a_contradiction(body):
    claim = claims_for(report_fixture())[0]
    outcome = compare(claim, claim["receipts"][0], Fetched("https://example.com", "", body, "new"))
    assert outcome[0] in {"changed", "unverifiable"}


def test_unrelated_page_changes_do_not_trigger_when_quote_survives():
    claim = claims_for(report_fixture())[0]
    assert (
        compare(
            claim,
            claim["receipts"][0],
            Fetched("https://example.com", "", "New header\nPro costs $49 per month.\nNew footer", "new"),
        )
        is None
    )
    assert compare(claim, claim["receipts"][0], None)[0] == "unverifiable"


def test_claims_without_retrieved_quotes_are_not_watchable():
    report = report_fixture()
    report.content["snapshot"]["observed_pricing"][0]["supporting_quote"] = "Invented quotation"
    assert claims_for(report) == []
