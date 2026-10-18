"""Rule-based recommendation baseline. Always available, fully explainable.

The AI synthesiser (if enabled) may refine wording and reasoning, but the
server re-validates its output and this baseline is the fallback.
"""

from app.models import Evidence, Experiment
from app.models.enums import Decision, EvidenceKind, Stance, UseCase

NEXT_STEPS = {
    Decision.CONTINUE: "Scale the experiment: widen the sample or move to the next riskiest assumption.",
    Decision.ITERATE: "Adjust the weakest element (segment, message or offer) and rerun with the same criteria.",
    Decision.PIVOT: "Reframe the hypothesis around the strongest contradicting signal and design a new test.",
    Decision.STOP: "Stop investing in this hypothesis; document what you learned and redirect effort.",
    Decision.INCONCLUSIVE: "Collect more data until each success criterion reaches its minimum sample.",
}

USE_CASE_HINTS = {
    UseCase.WILLINGNESS_TO_PAY: "Push for a concrete commitment (LOI, deposit or paid pilot) — verbal interest isn't proof.",
    UseCase.MESSAGING: "Keep sending until each variant reaches its minimum sample before picking a winner.",
    UseCase.FUNNEL_DIAGNOSIS: "Run the test that separates the competing explanations for the worst step.",
    UseCase.COMPETITIVE_RESEARCH: "Validate the positioning gap with 5 target-customer conversations.",
}


def decide(criteria: list[dict], evidence: list[Evidence]) -> tuple[Decision, float, str]:
    evaluable = [c for c in criteria if c["status"] in ("met", "not_met")]
    met = sum(1 for c in evaluable if c["status"] == "met")
    supports = sum(1 for e in evidence if e.stance == Stance.SUPPORTS)
    contradicts = sum(1 for e in evidence if e.stance == Stance.CONTRADICTS)

    if not criteria:
        return Decision.INCONCLUSIVE, 0.2, "No success criteria are defined, so nothing can be judged."
    if not evaluable:
        return Decision.INCONCLUSIVE, 0.25, "No criterion has enough data yet to be evaluated."

    coverage = len(evaluable) / len(criteria)
    if met == len(evaluable):
        decision = Decision.CONTINUE if coverage == 1 else Decision.ITERATE
        why = f"{met}/{len(criteria)} criteria met" + ("" if coverage == 1 else "; the rest lack data")
    elif met == 0:
        strong_against = contradicts >= max(2, 2 * supports)
        decision = Decision.STOP if strong_against and coverage == 1 else Decision.PIVOT
        why = f"No criteria met; evidence is {supports} supporting vs {contradicts} contradicting"
    else:
        decision = Decision.ITERATE
        why = f"Mixed result: {met}/{len(evaluable)} evaluable criteria met"

    # Confidence rises with criteria coverage and evidence volume, capped well below certainty.
    confidence = 0.35 + 0.35 * coverage + min(0.15, 0.02 * (supports + contradicts))
    return decision, round(min(confidence, 0.85), 2), why + "."


def build(
    exp: Experiment, metrics: dict, criteria: list[dict], evidence: list[Evidence], unknown_actions: int
):
    decision, confidence, why = decide(criteria, evidence)
    counter = [
        {"evidence_id": str(e.id), "claim": e.claim[:300]} for e in evidence if e.stance == Stance.CONTRADICTS
    ][:8]
    assumptions = [e.claim[:300] for e in evidence if e.kind == EvidenceKind.ASSUMPTION][:8]
    limitations = []
    for c in criteria:
        if c["status"] == "insufficient_sample":
            limitations.append(f"'{c['metric']}' has {c['sample']} of the {c['min_sample']} samples needed.")
        elif c["status"] == "no_data":
            limitations.append(f"No data recorded yet for '{c['metric']}'.")
    if metrics.get("includes_demo_data"):
        limitations.append("Based on DEMO data — not real customer results.")
    if unknown_actions:
        limitations.append(f"{unknown_actions} external action(s) have unconfirmed outcomes.")
    if not evidence:
        limitations.append("No research evidence has been recorded.")
    next_action = NEXT_STEPS[decision]
    if hint := USE_CASE_HINTS.get(exp.use_case):
        next_action = f"{next_action} {hint}"
    supporting = [e for e in evidence if e.stance == Stance.SUPPORTS]
    return {
        "decision": decision,
        "confidence": confidence,
        "rationale": why,
        "assumptions": assumptions,
        "counterevidence": counter,
        "limitations": limitations,
        "next_action": next_action,
        "evidence_ids": [str(e.id) for e in sorted(supporting, key=lambda e: -e.relevance)[:10]],
    }
