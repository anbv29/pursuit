from app.schemas.report import ReportContent
from app.services.report_validate import validate


def claim(text, kind="fact", ids=("S1",)):
    return {"text": text, "kind": kind, "confidence": "high", "source_ids": list(ids), "supporting_quote": ""}


def sample(**over):
    base = {
        "executive_summary": ["Sells claims software to clinics."],
        "snapshot": {
            "name": "Acme",
            "one_liner": "Claims automation",
            "offering": "SaaS",
            "business_model": "Subscription",
            "stage_assessment": "Early",
            "observed_pricing": [claim("Pro is $49/mo", ids=("S1",))],
            "key_facts": [claim("Founded 2024", ids=("S99",)), claim("Has 3 customers", ids=())],
        },
        "segments": [
            {
                "name": "Clinics",
                "description": "d",
                "pains": ["p"],
                "buying_trigger": "t",
                "decision_maker": "Owner",
                "fit_score": 9,
                "rationale": claim("why", "interpretation", ()),
            }
        ],
        "personas": [],
        "problems": [],
        "competitors": [
            {
                "name": "X",
                "url": "https://x.example",
                "positioning": "p",
                "target_customers": "t",
                "pricing": "$1",
                "strengths": [],
                "weaknesses": [],
                "source_ids": ["S1", "S42"],
            }
        ],
        "positioning": {"gaps": [], "recommended_statement": "s", "differentiators": []},
        "pricing": {"market_benchmarks": [], "hypotheses": [], "wtp_questions": []},
        "messaging": [],
        "prospecting": {"signals": [], "channels": [], "search_queries": []},
        "funnel_risks": [],
        "experiments": [
            {
                "use_case": "messaging",
                "title": "t",
                "hypothesis": "h",
                "metric": "made_up_metric",
                "comparator": ">=",
                "target": 3,
                "min_sample": 10,
                "why_first": "w",
                "effort": "low",
            },
            {
                "use_case": "messaging",
                "title": "t2",
                "hypothesis": "h",
                "metric": "positive_reply_rate",
                "comparator": ">=",
                "target": 12,
                "min_sample": 99999,
                "why_first": "w",
                "effort": "low",
            },
        ],
        "risks_and_unknowns": [],
        "focus_first": "Talk to clinics.",
    }
    base.update(over)
    return ReportContent.model_validate(base)


SOURCES = [{"id": "S1", "url": "https://acme.example/pricing", "title": "Pricing", "via": "web_fetch"}]


def test_sourced_fact_kept():
    data, _ = validate(sample(), SOURCES)
    assert data["snapshot"]["observed_pricing"][0] == claim("Pro is $49/mo") | {}


def test_invented_or_missing_sources_downgrade_facts():
    data, stats = validate(sample(), SOURCES)
    founded, customers = data["snapshot"]["key_facts"]
    assert founded["kind"] == "interpretation" and founded["unsourced"] and founded["source_ids"] == []
    assert customers["kind"] == "interpretation" and customers["confidence"] == "low"
    assert stats["downgraded_facts"] == 2 and stats["dropped_source_refs"] >= 2


def test_competitor_sources_filtered():
    data, _ = validate(sample(), SOURCES)
    assert data["competitors"][0]["source_ids"] == ["S1"]


def test_experiments_and_scores_clamped():
    data, stats = validate(sample(), SOURCES)
    bad, rate = data["experiments"]
    assert bad["metric"] == "positive_reply_rate" and stats["fixed_metrics"] == 1  # template default
    assert rate["target"] == 0.12 and rate["min_sample"] == 10_000
    assert data["segments"][0]["fit_score"] == 5
