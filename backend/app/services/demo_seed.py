"""Synthetic data for demo workspaces. Every record is origin=demo and the
workspace is flagged is_demo, so nothing here can be mistaken for real results.
URLs use the reserved example.com domain on purpose."""

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.db import utcnow
from app.models import (
    Evidence,
    Experiment,
    FunnelSnapshot,
    Interview,
    MessageVariant,
    OutcomeEvent,
    Prospect,
    Source,
    SuccessCriterion,
    User,
    Workspace,
)
from app.models.enums import DataOrigin as O
from app.models.enums import EvidenceKind as K
from app.models.enums import OutcomeKind as OK
from app.models.enums import Stage, Stance, UseCase
from app.services import recommendations

D = O.DEMO


def _exp(db, ws, user, use_case, title, hypothesis, audience, stage, criteria):
    e = Experiment(
        workspace_id=ws.id,
        created_by=user.id,
        use_case=use_case,
        title=title,
        hypothesis=hypothesis,
        target_audience=audience,
        stage=stage,
        is_demo=True,
    )
    e.criteria = [
        SuccessCriterion(metric=m, comparator=">=", target=t, min_sample=n, description=d)
        for m, t, n, d in criteria
    ]
    db.add(e)
    db.flush()
    return e


def _evidence(db, exp, ws, items):
    for url, title, kind, stance, claim, rel in items:
        src = None
        if url:
            src = Source(
                workspace_id=ws.id,
                experiment_id=exp.id,
                url=url,
                title=title,
                origin=D,
                excerpt=f"[DEMO] Synthetic excerpt for {title}.",
            )
            db.add(src)
            db.flush()
        db.add(
            Evidence(
                experiment_id=exp.id,
                source_id=src.id if src else None,
                kind=kind,
                stance=stance,
                claim=claim,
                relevance=rel,
                origin=D,
            )
        )


def seed_workspace(db: Session, ws: Workspace, user: User) -> None:
    # 1) Problem discovery — rich, at analysis stage
    pd = _exp(
        db,
        ws,
        user,
        UseCase.PROBLEM_DISCOVERY,
        "Clinic claims reconciliation",
        "Practice managers at independent clinics spend 5+ hours a week reconciling claims by hand.",
        "Independent outpatient clinics, 5-30 staff, US",
        Stage.ANALYSIS,
        [
            ("interviews_completed", 6, 0, "Completed discovery calls"),
            ("problem_confirmed_rate", 0.6, 5, "Concrete recent example of the problem"),
        ],
    )
    _evidence(
        db,
        pd,
        ws,
        [
            (
                "https://example.com/demo/mgma-survey",
                "Practice ops survey (demo)",
                K.OBSERVED_FACT,
                Stance.SUPPORTS,
                "58% of surveyed small practices reconcile remittances in spreadsheets.",
                0.85,
            ),
            (
                "https://example.com/demo/clearinghouse",
                "Clearinghouse feature page (demo)",
                K.OBSERVED_FACT,
                Stance.CONTRADICTS,
                "Two major clearinghouses now bundle auto-reconciliation for free.",
                0.7,
            ),
            (
                None,
                "",
                K.ASSUMPTION,
                Stance.NEUTRAL,
                "Practice managers own the budget for back-office tools.",
                0.5,
            ),
            (None, "", K.INTERPRETATION, Stance.SUPPORTS, "Pain is sharpest in multi-payer clinics.", 0.6),
        ],
    )
    names = [
        ("Dana Ruiz", "Northside Family Clinic"),
        ("Sam Patel", "Lakeview Pediatrics"),
        ("Jo Kim", "Harbor Physical Therapy"),
        ("Alex Moreno", "Elm St Dermatology"),
        ("Riley Chen", "Summit Urgent Care"),
        ("Taylor Brooks", "Cedar Dental Group"),
    ]
    pains = [
        ["manual remittance matching", "denied claim follow-up"],
        ["manual remittance matching"],
        [],
        ["denied claim follow-up"],
        ["manual remittance matching", "payer portal logins"],
        [],
    ]
    for i, ((name, company), pain) in enumerate(zip(names, pains, strict=True)):
        p = Prospect(
            workspace_id=ws.id,
            experiment_id=pd.id,
            name=name,
            company=company,
            role="Practice manager",
            email=f"{name.split()[0].lower()}@example.com",
            segment="Independent clinic",
            status="interviewed" if i < 5 else "scheduled",
            origin=D,
        )
        db.add(p)
        db.flush()
        if i < 5:
            db.add(
                Interview(
                    experiment_id=pd.id,
                    prospect_id=p.id,
                    status="completed",
                    origin=D,
                    pain_points=pain,
                    notes="[DEMO] Synthetic interview notes.",
                    current_solution="Excel + payer portals" if pain else "",
                    frequency="weekly" if pain else "",
                    cost_of_problem="4-8 hrs/week" if len(pain) > 1 else "",
                    budget_owner="Practice owner" if i % 2 == 0 else "",
                    wtp_signal="verbal" if i == 0 else "none",
                    scheduled_at=utcnow() - timedelta(days=10 - i),
                )
            )
            db.add(
                OutcomeEvent(
                    experiment_id=pd.id,
                    prospect_id=p.id,
                    kind=OK.INTERVIEW_COMPLETED,
                    origin=D,
                    occurred_at=utcnow() - timedelta(days=10 - i),
                )
            )

    # 2) Messaging experiment — two variants with small samples
    ms = _exp(
        db,
        ws,
        user,
        UseCase.MESSAGING,
        "Cost vs. speed cold email angle",
        "A cost-savings angle gets more positive replies from clinic owners than a time-savings angle.",
        "Clinic owners, US",
        Stage.OUTCOMES,
        [("positive_reply_rate", 0.1, 30, "Positive replies / sent, per variant")],
    )
    data = {"A": ("Cut claim rework costs", 24, 5, 3), "B": ("Get 6 hours back every week", 22, 3, 1)}
    for label, (subject, sent, replied, positive) in data.items():
        v = MessageVariant(
            experiment_id=ms.id,
            label=label,
            subject=subject,
            angle=subject,
            body="[DEMO] Hi {first_name}, ...",
        )
        db.add(v)
        db.flush()
        for kind, n in ((OK.SENT, sent), (OK.REPLIED, replied), (OK.POSITIVE_REPLY, positive)):
            db.add_all(
                OutcomeEvent(experiment_id=ms.id, variant_id=v.id, kind=kind, origin=D) for _ in range(n)
            )

    # 3) Funnel diagnosis
    fd = _exp(
        db,
        ws,
        user,
        UseCase.FUNNEL_DIAGNOSIS,
        "Self-serve trial leak",
        "Trial-to-paid is our biggest leak because clinics never connect a payer account.",
        "Self-serve signups",
        Stage.ANALYSIS,
        [("worst_stage_conversion", 0.25, 100, "Weakest step conversion")],
    )
    db.add(
        FunnelSnapshot(
            experiment_id=fd.id,
            label="Last 30 days (demo)",
            origin=D,
            stages=[
                {"name": "Site visitors", "count": 12400},
                {"name": "Trial signups", "count": 610},
                {"name": "Payer connected", "count": 140},
                {"name": "Paid", "count": 38},
            ],
        )
    )

    # 4) Competitive research
    cr = _exp(
        db,
        ws,
        user,
        UseCase.COMPETITIVE_RESEARCH,
        "Reconciliation tools landscape",
        "No competitor targets clinics under 30 staff with per-claim pricing.",
        "Independent clinics",
        Stage.EVIDENCE,
        [("competitors_profiled", 4, 0, "Competitors with sourced pricing")],
    )
    db.flush()
    for name, claim, stance in [
        ("ClaimSync", "ClaimSync prices per provider seat, starting at $299/month.", Stance.SUPPORTS),
        ("RemitIQ", "RemitIQ offers per-claim pricing but only for 50+ staff groups.", Stance.SUPPORTS),
        ("PayerPilot", "PayerPilot launched a free tier for small clinics in 2026.", Stance.CONTRADICTS),
    ]:
        src = Source(
            workspace_id=ws.id,
            experiment_id=cr.id,
            url=f"https://example.com/demo/{name.lower()}",
            title=f"{name} pricing (demo)",
            origin=D,
            excerpt="[DEMO] Synthetic pricing page.",
        )
        db.add(src)
        db.flush()
        db.add(
            Evidence(
                experiment_id=cr.id,
                source_id=src.id,
                kind=K.OBSERVED_FACT,
                stance=stance,
                claim=claim,
                relevance=0.8,
                tags=[f"competitor:{name}", "pricing"],
                origin=D,
            )
        )
    db.commit()
    recommendations.generate(db, pd, user, use_ai=False)
    from app.services.demo_report import seed

    seed(db, ws, user)
