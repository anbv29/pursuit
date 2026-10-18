from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ActionRequest, Experiment, FunnelSnapshot, Recommendation, User
from app.models.enums import ActionStatus, DataOrigin, Decision
from app.services import ai, evidence, metrics, recommend_rules
from app.services.experiments import log

AI_CONFIDENCE_CAP = 0.9


def analysis(db: Session, exp: Experiment) -> dict:
    m = metrics.compute(db, exp)
    return {"metrics": m, "criteria": metrics.evaluate_criteria(exp, m)}


def generate(db: Session, exp: Experiment, user: User, use_ai: bool = True) -> Recommendation:
    a = analysis(db, exp)
    m, criteria = a["metrics"], a["criteria"]
    ev = [e for e in evidence.list_evidence(db, exp) if exp.is_demo or e.origin != DataOrigin.DEMO]
    unknown = (
        db.scalar(
            select(func.count(ActionRequest.id)).where(
                ActionRequest.experiment_id == exp.id, ActionRequest.status == ActionStatus.UNKNOWN
            )
        )
        or 0
    )
    base = recommend_rules.build(exp, m, criteria, ev, unknown)
    generated_by = "rules"

    synth = ai.synthesize(exp, m, criteria, ev) if use_ai else None
    if synth is not None:
        valid_ids = {str(e.id) for e in ev}
        decision = synth.decision
        # Server-side guard: the model can't declare a verdict the data can't support.
        if base["decision"] == Decision.INCONCLUSIVE and decision != Decision.INCONCLUSIVE:
            decision = Decision.INCONCLUSIVE
        base.update(
            decision=decision,
            confidence=round(min(synth.confidence, AI_CONFIDENCE_CAP), 2),
            rationale=synth.rationale,
            assumptions=list(dict.fromkeys(base["assumptions"] + synth.assumptions))[:10],
            limitations=list(dict.fromkeys(base["limitations"] + synth.limitations))[:10],
            next_action=synth.next_action,
            evidence_ids=[i for i in synth.cited_evidence_ids if i in valid_ids] or base["evidence_ids"],
        )
        generated_by = f"claude:{ai.ai_usage.model(ai.get_settings().anthropic_model)}"
    elif use_ai and ai.get_settings().ai_enabled:
        base["limitations"].append("AI synthesis was unavailable; this is the rule-based recommendation.")

    rec = Recommendation(
        experiment_id=exp.id,
        metrics_snapshot={"criteria": criteria, "interviews_completed": m["interviews_completed"]},
        generated_by=generated_by,
        includes_demo_data=bool(m["includes_demo_data"]),
        **base,
    )
    db.add(rec)
    db.flush()
    log(db, exp, user, "recommendation.generate", decision=rec.decision.value, by=generated_by)
    db.commit()
    return rec


def list_for_experiment(db: Session, exp: Experiment):
    return db.scalars(
        select(Recommendation)
        .where(Recommendation.experiment_id == exp.id)
        .order_by(Recommendation.created_at.desc())
    ).all()


def save_funnel(db: Session, exp: Experiment, user: User, stages: list[dict], label: str, origin: DataOrigin):
    snap = FunnelSnapshot(
        experiment_id=exp.id,
        stages=stages,
        label=label[:120],
        origin=DataOrigin.DEMO if exp.is_demo else origin,
    )
    db.add(snap)
    db.flush()
    log(db, exp, user, "funnel.save", stages=len(stages), origin=snap.origin.value)
    db.commit()
    return snap
