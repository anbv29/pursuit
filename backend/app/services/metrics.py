"""Experiment metrics computed from persisted records only.

Demo records are excluded from live experiments, and a demo experiment's
metrics are flagged `includes_demo_data` so the UI can label them.
"""

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Evidence, Experiment, FunnelSnapshot, Interview, MessageVariant, OutcomeEvent
from app.models.enums import DataOrigin, OutcomeKind, Stance
from app.services import funnel, stats


def _visible(exp: Experiment, origin: DataOrigin) -> bool:
    return exp.is_demo or origin != DataOrigin.DEMO


def compute(db: Session, exp: Experiment) -> dict:
    all_outcomes = db.scalars(select(OutcomeEvent).where(OutcomeEvent.experiment_id == exp.id)).all()
    outcomes = [o for o in all_outcomes if _visible(exp, o.origin)]
    # Simulated events in a live experiment are reported separately, never mixed in.
    simulated = Counter(o.kind.value for o in all_outcomes if not _visible(exp, o.origin))
    interviews = [
        i
        for i in db.scalars(select(Interview).where(Interview.experiment_id == exp.id))
        if _visible(exp, i.origin)
    ]
    evidence = [
        e
        for e in db.scalars(select(Evidence).where(Evidence.experiment_id == exp.id))
        if _visible(exp, e.origin)
    ]
    counts = Counter(o.kind for o in outcomes)
    m: dict = {
        "includes_demo_data": exp.is_demo,
        "outcome_counts": {k.value: counts[k] for k in OutcomeKind},
        "excluded_simulated_outcomes": dict(simulated),
    }

    # Interviews / discovery / WTP
    done = [i for i in interviews if i.status == "completed"]
    n = len(done)
    confirmed = sum(1 for i in done if i.pain_points)
    strong = sum(1 for i in done if i.pain_points and i.frequency and i.cost_of_problem)
    budget = sum(1 for i in done if i.budget_owner)
    m["interviews_completed"] = n
    m["problem_confirmed"] = stats.wilson(confirmed, n).dict()
    m["strong_pain"] = stats.wilson(strong, n).dict()
    m["budget_owner_identified"] = stats.wilson(budget, n).dict()
    m["verbal_interest"] = (
        sum(1 for i in done if i.wtp_signal == "verbal") + counts[OutcomeKind.VERBAL_INTEREST]
    )
    m["commitments"] = sum(1 for i in done if i.wtp_signal == "commitment") + counts[OutcomeKind.COMMITMENT]
    m["pain_point_frequency"] = Counter(p.lower() for i in done for p in i.pain_points).most_common(8)

    # Messaging, per variant. Denominator is messages actually recorded as sent.
    variants = db.scalars(select(MessageVariant).where(MessageVariant.experiment_id == exp.id)).all()
    per_variant = []
    for v in variants:
        c = Counter(o.kind for o in outcomes if o.variant_id == v.id)
        sent = c[OutcomeKind.SENT]
        per_variant.append(
            {
                "variant_id": str(v.id),
                "label": v.label,
                "sent": sent,
                "delivered": c[OutcomeKind.DELIVERED],
                "reply": stats.wilson(c[OutcomeKind.REPLIED], sent).dict(),
                "positive_reply": stats.wilson(c[OutcomeKind.POSITIVE_REPLY], sent).dict(),
                "meetings": c[OutcomeKind.MEETING_BOOKED],
            }
        )
    m["variants"] = per_variant
    total_sent = counts[OutcomeKind.SENT]
    m["positive_reply"] = stats.wilson(counts[OutcomeKind.POSITIVE_REPLY], total_sent).dict()
    m["meetings_booked"] = counts[OutcomeKind.MEETING_BOOKED]

    # Evidence balance and competitive coverage
    m["evidence"] = {s.value: sum(1 for e in evidence if e.stance == s) for s in Stance}
    m["competitors_profiled"] = len(
        {
            t.split(":", 1)[1].strip().lower()
            for e in evidence
            for t in e.tags
            if t.lower().startswith("competitor:")
        }
    )

    # Funnel (latest visible snapshot)
    snaps = [
        s
        for s in db.scalars(
            select(FunnelSnapshot)
            .where(FunnelSnapshot.experiment_id == exp.id)
            .order_by(FunnelSnapshot.created_at.desc())
        )
        if _visible(exp, s.origin)
    ]
    m["funnel"] = funnel.analyze(snaps[0].stages) if snaps else None
    return m


# Map criterion metric names to (value, sample size) extracted from computed metrics.
def metric_value(m: dict, name: str) -> tuple[float | None, int]:
    rate_metrics = {
        "problem_confirmed_rate": "problem_confirmed",
        "strong_pain_rate": "strong_pain",
        "budget_owner_identified_rate": "budget_owner_identified",
        "positive_reply_rate": "positive_reply",
    }
    if name in rate_metrics:
        r = m[rate_metrics[name]]
        return r["value"], r["denominator"]
    if name in (
        "interviews_completed",
        "commitments",
        "meetings_booked",
        "competitors_profiled",
        "verbal_interest",
    ):
        return float(m[name]), int(m[name])
    if name == "worst_stage_conversion" and m.get("funnel") and m["funnel"]["bottleneck"]:
        conv = m["funnel"]["bottleneck"]["conversion"]
        return conv["value"], conv["denominator"]
    if name in m.get("outcome_counts", {}):
        return float(m["outcome_counts"][name]), int(m["outcome_counts"][name])
    return None, 0


def evaluate_criteria(exp: Experiment, m: dict) -> list[dict]:
    results = []
    for c in exp.criteria:
        value, sample = metric_value(m, c.metric)
        if value is None:
            status = "no_data"
        elif sample < c.min_sample:
            status = "insufficient_sample"
        else:
            status = "met" if stats.evaluate(c.comparator, value, c.target) else "not_met"
        results.append(
            {
                "criterion_id": str(c.id),
                "metric": c.metric,
                "comparator": c.comparator,
                "target": c.target,
                "min_sample": c.min_sample,
                "value": value,
                "sample": sample,
                "status": status,
            }
        )
    return results
