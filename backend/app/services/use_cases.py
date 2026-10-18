"""Per-use-case templates on top of the shared engine.

Each template supplies copy for the creation flow, sensible default success
criteria, and which external action kinds the use case may request.
"""

from app.models.enums import ActionKind, UseCase

TEMPLATES: dict[UseCase, dict] = {
    UseCase.SEGMENT_VALIDATION: {
        "name": "Customer segment validation",
        "summary": "Find out which customer segment feels the problem most and is reachable.",
        "hypothesis_hint": "Operations leads at 50-200 person logistics companies lose 5+ hours a week to X.",
        "default_criteria": [
            {
                "metric": "interviews_completed",
                "comparator": ">=",
                "target": 8,
                "min_sample": 0,
                "description": "Enough conversations per segment to compare.",
            },
            {
                "metric": "strong_pain_rate",
                "comparator": ">=",
                "target": 0.5,
                "min_sample": 8,
                "description": "Share of interviews describing the problem as a top-3 priority.",
            },
        ],
        "actions": [ActionKind.SEND_EMAIL, ActionKind.SCHEDULE_MEETING],
    },
    UseCase.WILLINGNESS_TO_PAY: {
        "name": "Willingness-to-pay validation",
        "summary": "Separate polite interest from budget, ownership and real commitments.",
        "hypothesis_hint": "Seed-stage SaaS founders will pay $200/month to automate investor updates.",
        "default_criteria": [
            {
                "metric": "commitments",
                "comparator": ">=",
                "target": 3,
                "min_sample": 0,
                "description": "LOIs, deposits or paid pilots — not verbal interest.",
            },
            {
                "metric": "budget_owner_identified_rate",
                "comparator": ">=",
                "target": 0.6,
                "min_sample": 5,
                "description": "Share of conversations where the budget owner is known.",
            },
        ],
        "actions": [ActionKind.SEND_EMAIL, ActionKind.SCHEDULE_MEETING],
    },
    UseCase.MESSAGING: {
        "name": "Messaging & outreach experiment",
        "summary": "Compare message variants on real replies and meetings, with honest sample sizes.",
        "hypothesis_hint": "A cost-savings angle gets more positive replies than a speed angle from CFOs.",
        "default_criteria": [
            {
                "metric": "positive_reply_rate",
                "comparator": ">=",
                "target": 0.1,
                "min_sample": 30,
                "description": "Positive replies / messages sent, per variant.",
            },
            {
                "metric": "meetings_booked",
                "comparator": ">=",
                "target": 3,
                "min_sample": 0,
                "description": "Meetings booked across variants.",
            },
        ],
        "actions": [ActionKind.SEND_EMAIL],
    },
    UseCase.PROBLEM_DISCOVERY: {
        "name": "Problem validation & discovery",
        "summary": "Run behaviour-based interviews and record what is and isn't validated.",
        "hypothesis_hint": "Clinic managers currently reconcile insurance claims by hand every week.",
        "default_criteria": [
            {
                "metric": "interviews_completed",
                "comparator": ">=",
                "target": 5,
                "min_sample": 0,
                "description": "Completed discovery interviews.",
            },
            {
                "metric": "problem_confirmed_rate",
                "comparator": ">=",
                "target": 0.6,
                "min_sample": 5,
                "description": "Share of interviews with a concrete recent example of the problem.",
            },
        ],
        "actions": [ActionKind.SEND_EMAIL, ActionKind.SCHEDULE_MEETING],
    },
    UseCase.COMPETITIVE_RESEARCH: {
        "name": "Competitive research & positioning",
        "summary": "Map competitors, pricing and positioning with sources, then find the gap.",
        "hypothesis_hint": "No competitor targets agencies under 20 people with usage-based pricing.",
        "default_criteria": [
            {
                "metric": "competitors_profiled",
                "comparator": ">=",
                "target": 5,
                "min_sample": 0,
                "description": "Competitors with sourced pricing and positioning.",
            },
        ],
        "actions": [],
    },
    UseCase.FUNNEL_DIAGNOSIS: {
        "name": "GTM funnel diagnosis",
        "summary": "Find the stage that leaks the most and design an experiment to explain why.",
        "hypothesis_hint": "Trial-to-paid is our biggest leak because users never connect a data source.",
        "default_criteria": [
            {
                "metric": "worst_stage_conversion",
                "comparator": ">=",
                "target": 0.25,
                "min_sample": 100,
                "description": "Weakest stage-to-stage conversion after the change.",
            },
        ],
        "actions": [],
    },
}


def template(use_case: UseCase) -> dict:
    return TEMPLATES[use_case]


def public_templates() -> list[dict]:
    return [
        {
            **{k: v for k, v in t.items() if k != "actions"},
            "use_case": uc.value,
            "actions": [a.value for a in t["actions"]],
        }
        for uc, t in TEMPLATES.items()
    ]
