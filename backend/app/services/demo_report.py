"""A deliberately synthetic sample, available without spending AI or customer credits."""

from app.core.db import utcnow
from app.models import Report
from app.schemas.report import ReportContent


def seed(db, workspace, user):
    content = ReportContent.model_validate(
        {
            "executive_summary": [
                "Synthetic example: explore the report format without running research.",
                "Start with customer interviews before treating the assumptions as validated.",
            ],
            "focus_first": "Ask five clinic managers how they handled their last reconciliation problem.",
            "snapshot": {
                "name": "ClinicFlow — synthetic example",
                "one_liner": "An imaginary claims-reconciliation tool.",
                "offering": "Illustrative workflow software",
                "business_model": "Subscription hypothesis",
                "stage_assessment": "Unvalidated example",
                "observed_pricing": [],
                "key_facts": [],
            },
            "segments": [
                {
                    "name": "Independent clinics",
                    "description": "Example audience: clinics with small operations teams.",
                    "pains": ["Assumed time spent reconciling claims"],
                    "buying_trigger": "Unverified backlog growth",
                    "decision_maker": "Practice manager",
                    "fit_score": 3,
                    "rationale": {
                        "text": "A possible starting segment; no customer evidence has been collected.",
                        "kind": "assumption",
                        "confidence": "low",
                        "source_ids": [],
                    },
                }
            ],
            "personas": [
                {
                    "title": "Practice manager",
                    "goals": ["Understand unpaid claims"],
                    "pains": ["Possible spreadsheet work"],
                    "objections": ["Unknown switching effort"],
                    "where_to_find": ["Permission-based professional communities"],
                }
            ],
            "problems": [
                {
                    "statement": "Clinic managers may spend too long reconciling claims.",
                    "supporting": [],
                    "against": [],
                    "how_to_validate": "Ask about the last incident, its frequency and actual cost.",
                }
            ],
            "competitors": [],
            "positioning": {
                "gaps": [],
                "recommended_statement": "Draft: claims clarity for small clinics.",
                "differentiators": ["No differentiation has been verified."],
            },
            "pricing": {
                "market_benchmarks": [],
                "hypotheses": ["No price has been validated."],
                "wtp_questions": ["What do you currently pay to handle this?"],
            },
            "messaging": [
                {
                    "name": "Research invitation",
                    "segment": "Independent clinics",
                    "hook": "Learn about recent behavior",
                    "subject": "Could we learn how you handle reconciliation?",
                    "body": "Would you share how you handled your last claims backlog?",
                }
            ],
            "prospecting": {
                "signals": ["Unverified operational backlog"],
                "channels": ["Founder introductions"],
                "search_queries": ["Independent clinic practice manager"],
            },
            "funnel_risks": [
                {
                    "stage": "Interview invitations",
                    "risk": "The problem may not be important enough to discuss.",
                    "leading_metric": "Confirmed interviews",
                    "test": "Invite a small, approved group.",
                }
            ],
            "experiments": [
                {
                    "use_case": "problem_discovery",
                    "title": "Interview five practice managers",
                    "hypothesis": "Managers repeatedly reconcile claims manually and find it costly.",
                    "metric": "interviews_completed",
                    "comparator": ">=",
                    "target": 5,
                    "min_sample": 5,
                    "why_first": "Check recent behavior before building.",
                    "effort": "low",
                }
            ],
            "risks_and_unknowns": [
                "All details are synthetic. No live research, prices, customers or outcomes are claimed."
            ],
        }
    )
    db.add(
        Report(
            workspace_id=workspace.id,
            created_by=user.id,
            company_url="https://example.com",
            company_name="ClinicFlow — synthetic example",
            status="SUCCEEDED",
            progress="Synthetic sample",
            content=content.model_dump(mode="json"),
            sources=[],
            model="synthetic-demo-no-AI",
            inputs={"synthetic": "true"},
            finished_at=utcnow(),
        )
    )
    db.commit()
