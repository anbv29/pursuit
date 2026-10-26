import copy

import pytest
from pydantic import ValidationError

from app.schemas.gtm import GTMConstraints
from app.schemas.report import ReportIn
from app.services.report_validate import validate
from tests.test_report_validate import claim, sample

pytestmark = pytest.mark.no_database

QUOTE = "The Pro plan costs $49 per seat per month."
SOURCES = [{"id": "S1", "url": "https://acme.example/pricing", "excerpt": QUOTE}]


def strategy():
    return {
        "objective": "Find the first paying clinic for reconciliation software.",
        "first_buyer": claim("Independent clinic owners", "assumption", ()),
        "positioning": claim("Resolve unpaid claims without another spreadsheet.", "interpretation", ()),
        "buying_process": ["Interview the owner about the last unpaid claim."],
        "channels": [
            {
                "name": "Clinic owner interviews",
                "audience": "Independent clinic owners",
                "rationale": claim("Test the reported reconciliation pain.", "assumption", ()),
                "first_action": "Ask existing clinic contacts for a workflow walkthrough.",
                "weekly_hours": 12,
                "monthly_budget": 500,
                "success_signal": "An owner agrees to a paid pilot.",
                "stop_rule": "Stop if the owner already resolves claims cheaply.",
            }
        ],
        "launch_plan": [
            {
                "start_day": 1,
                "end_day": 90,
                "action": "Interview clinic owners.",
                "deliverable": "A documented buying decision.",
                "decision_gate": "Proceed only after confirming a budget owner.",
            }
        ],
        "not_now": ["Broad paid ads before buyer validation."],
        "assumptions": ["The founder can reach clinic owners."],
        "resourcing_note": "Proposed test, not measured traction.",
    }


def test_unknown_resources_differ_from_zero_and_non_finite_inputs_are_rejected():
    assert GTMConstraints().monthly_budget is None
    assert GTMConstraints(monthly_budget=0).monthly_budget == 0
    with pytest.raises(ValidationError):
        GTMConstraints(weekly_hours=float("nan"))
    with pytest.raises(ValidationError):
        ReportIn(company_url="https://example.com", research_urls=["https://example.com"] * 7)


def test_unrelated_quote_cannot_authorize_an_invented_number():
    content = sample()
    content.snapshot.observed_pricing[0].text = "Pro is $9999 per month."
    content.snapshot.observed_pricing[0].supporting_quote = QUOTE
    data, _ = validate(content, SOURCES)
    result = data["snapshot"]["observed_pricing"][0]
    assert result["kind"] != "fact" and result["source_ids"] == []


@pytest.mark.parametrize(
    "text", ["Pro costs $49 per year.", "Pro costs €49 per month.", "Pro costs $49 million per month."]
)
def test_numeric_facts_cannot_change_currency_scale_or_period(text):
    content = sample()
    content.snapshot.observed_pricing[0].text = text
    content.snapshot.observed_pricing[0].supporting_quote = QUOTE
    data, _ = validate(content, SOURCES)
    assert data["snapshot"]["observed_pricing"][0]["kind"] != "fact"


@pytest.mark.parametrize(
    "quote,text",
    [
        ("Pro costs $49 million per month.", "Pro costs $49 per month."),
        ("Pro costs $49 per month.", "Pro costs $49 per week."),
    ],
)
def test_numeric_checks_reject_removed_scale_and_unmatched_weeks(quote, text):
    from app.services.evidence_checks import numeric_support

    assert not numeric_support(text, quote)


def test_numeric_checks_keep_amount_subject_currency_and_period_together():
    from app.services.evidence_checks import numeric_support

    quote = "Basic costs USD 49 per month and Pro costs EUR 99 per year."
    swapped = "Basic costs EUR 99 per month and Pro costs USD 49 per year."
    assert not numeric_support(swapped, quote)
    assert numeric_support("Basic costs USD 49 per month", quote)


def test_measurements_do_not_drop_negative_signs_or_other_amounts():
    from app.services.evidence_checks import measurement_matches

    quote = "The conversion rate changed by -20% in 2025."
    point = {"quote": quote, "value": "20", "unit": "percent", "scope": "conversion rate", "period": "2025"}
    assert not measurement_matches(point, {"excerpt": quote})
    assert measurement_matches(dict(point, value="-20"), {"excerpt": quote})
    quote = "Basic costs USD 49 per month and Pro costs USD 99 per month."
    point = {"quote": quote, "value": "49", "unit": "USD per month", "scope": "Pro", "period": "Not stated"}
    assert not measurement_matches(point, {"excerpt": quote})


@pytest.mark.parametrize("minus", ["−", "﹣", "－", "–"])
def test_unicode_minus_keeps_the_sign_for_claims_and_measurements(minus):
    from app.services.evidence_checks import measurement_matches, numeric_support

    quote = f"The conversion rate changed by {minus}20% in 2025."
    point = {"quote": quote, "value": "20", "unit": "percent", "scope": "conversion rate", "period": "2025"}
    assert not numeric_support("20% in 2025.", quote)
    assert not measurement_matches(point, {"excerpt": quote})
    assert measurement_matches(dict(point, value="-20"), {"excerpt": quote})


def test_strategy_context_remains_bounded_for_large_valid_reports():
    import json

    from app.services.report_research import _strategy_report
    from app.services.research_context import MAX_REQUEST_BYTES, encoded_size, fit_payload

    report = sample().model_dump()
    report["executive_summary"] = ["Long summary " * 5000] * 12
    report["snapshot"]["offering"] = "Large offering " * 10000
    compact = _strategy_report(report)
    assert len(json.dumps(compact).encode()) <= 16000
    packed = fit_payload(
        {
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "validated_report": compact,
                            "sources": [
                                {
                                    "id": f"S{i}",
                                    "url": f"https://example.com/{i}",
                                    "excerpt": "Evidence " * 6000,
                                }
                                for i in range(24)
                            ],
                        }
                    ),
                }
            ]
        }
    )
    assert encoded_size(packed) <= MAX_REQUEST_BYTES


def test_absent_excerpts_fail_closed_and_each_citation_needs_the_quote():
    content = sample()
    c = content.snapshot.observed_pricing[0]
    c.source_ids, c.supporting_quote = ["S1", "S2"], QUOTE
    c.text = QUOTE
    data, _ = validate(content, SOURCES + [{"id": "S2", "excerpt": "Unrelated public content."}])
    assert data["snapshot"]["observed_pricing"][0]["source_ids"] == ["S1"]
    data, _ = validate(content, [{"id": "S1", "url": "https://example.com"}])
    assert data["snapshot"]["observed_pricing"][0]["kind"] != "fact"


def test_interpretations_cannot_keep_invented_quotes_or_high_confidence():
    content = sample()
    c = content.snapshot.observed_pricing[0]
    c.kind, c.supporting_quote = "interpretation", "An invented quote with no source match."
    data, _ = validate(content, SOURCES)
    result = data["snapshot"]["observed_pricing"][0]
    assert result["source_ids"] == [] and result["supporting_quote"] == ""
    assert result["confidence"] == "low"


def test_measurements_require_literal_value_in_a_verified_quote():
    point = {
        "label": "Published Pro price",
        "value": "49",
        "unit": "USD per seat per month",
        "scope": "Pro plan",
        "period": "Not stated",
        "source_id": "S1",
        "quote": QUOTE,
        "caveat": "Listed price, not observed payments.",
    }
    content = sample(measurements=[point, dict(point, value="9999"), dict(point, source_id="fake")])
    data, stats = validate(content, SOURCES)
    assert data["measurements"] == [point]
    assert stats["dropped_measurements"] == 2


def test_strategy_allocations_respect_zero_budget_hours_and_horizon():
    content = sample(gtm_strategy=strategy())
    limits = {"monthly_budget": 0, "currency": "INR", "weekly_hours": 4, "horizon_days": 30}
    data, _ = validate(content, SOURCES, gtm_constraints=limits)
    plan = data["gtm_strategy"]
    assert sum(c["monthly_budget"] for c in plan["channels"]) == 0
    assert sum(c["weekly_hours"] for c in plan["channels"]) <= 4
    assert all(p["start_day"] <= p["end_day"] <= 30 for p in plan["launch_plan"])
    assert plan["budget_currency"] == "INR" and plan["resource_adjustments"]
    assert plan["constraints"]["monthly_budget"] == 0


def test_validation_does_not_mutate_the_input_and_legacy_reports_remain_readable():
    content = sample()
    before = copy.deepcopy(content.model_dump())
    data, _ = validate(content, SOURCES)
    assert content.model_dump() == before
    assert data["gtm_strategy"] is None and data["measurements"] == []
