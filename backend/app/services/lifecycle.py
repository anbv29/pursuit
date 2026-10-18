"""Shared experiment lifecycle used by all six use cases.

Hypothesis -> Research -> Evidence -> Design -> Approval -> Action -> Outcomes
-> Analysis -> Recommendation

Moving forward is one step at a time and gated by what the next stage needs.
Moving back to any earlier stage is always allowed (that is how ITERATE works).
"""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ActionRequest,
    Evidence,
    Experiment,
    FunnelSnapshot,
    OutcomeEvent,
    Recommendation,
    SuccessCriterion,
)
from app.models.enums import STAGE_ORDER, ActionStatus, Stage, UseCase

# Use cases whose core loop doesn't require external actions may skip Approval/Action.
ACTIONLESS = {UseCase.COMPETITIVE_RESEARCH, UseCase.FUNNEL_DIAGNOSIS}

# Someone approved it and it went (or is going) to Fo. Cancelled and rejected never count.
APPROVED_STATUSES = [
    ActionStatus.QUEUED,
    ActionStatus.RUNNING,
    ActionStatus.SUCCEEDED,
    ActionStatus.FAILED,
    ActionStatus.UNKNOWN,
]


@dataclass
class Gate:
    ok: bool
    reason: str = ""


def _count(db: Session, stmt) -> int:
    return db.scalar(select(func.count()).select_from(stmt.subquery())) or 0


def gate_for(db: Session, exp: Experiment, target: Stage) -> Gate:
    """What must be true before an experiment can enter `target`."""
    eid = exp.id
    if target == Stage.EVIDENCE and not _count(db, select(Evidence.id).where(Evidence.experiment_id == eid)):
        return Gate(False, "Add at least one piece of evidence first.")
    if target == Stage.DESIGN:
        return Gate(True)
    if target == Stage.APPROVAL and not _count(
        db, select(SuccessCriterion.id).where(SuccessCriterion.experiment_id == eid)
    ):
        return Gate(False, "Define at least one success criterion before requesting approval.")
    if target == Stage.ACTION and exp.use_case not in ACTIONLESS:
        approved = _count(
            db,
            select(ActionRequest.id).where(
                ActionRequest.experiment_id == eid,
                ActionRequest.status.in_(APPROVED_STATUSES),
            ),
        )
        if not approved:
            return Gate(False, "Approve at least one action before moving to Action.")
    if target == Stage.ANALYSIS:
        if exp.use_case == UseCase.FUNNEL_DIAGNOSIS:
            if not _count(db, select(FunnelSnapshot.id).where(FunnelSnapshot.experiment_id == eid)):
                return Gate(False, "Import or enter funnel data before analysis.")
        elif exp.use_case not in ACTIONLESS and not _count(
            db, select(OutcomeEvent.id).where(OutcomeEvent.experiment_id == eid)
        ):
            return Gate(False, "Record at least one outcome before analysis.")
    if target == Stage.RECOMMENDATION and not _count(
        db, select(Recommendation.id).where(Recommendation.experiment_id == eid)
    ):
        return Gate(False, "Generate a recommendation first.")
    return Gate(True)


def can_transition(db: Session, exp: Experiment, target: Stage) -> Gate:
    cur, nxt = STAGE_ORDER.index(exp.stage), STAGE_ORDER.index(target)
    if nxt == cur:
        return Gate(False, "Experiment is already in that stage.")
    if nxt < cur:
        return Gate(True)
    if nxt != cur + 1:
        return Gate(False, f"Stages must be completed in order; next is '{STAGE_ORDER[cur + 1].value}'.")
    return gate_for(db, exp, target)


def stage_checklist(db: Session, exp: Experiment) -> list[dict]:
    """Per-stage readiness for the UI progress rail."""
    cur = STAGE_ORDER.index(exp.stage)
    out = []
    for i, st in enumerate(STAGE_ORDER):
        gate = gate_for(db, exp, st) if i > cur else Gate(True)
        out.append(
            {
                "stage": st.value,
                "state": "done" if i < cur else "current" if i == cur else "upcoming",
                "ready": gate.ok,
                "blocker": gate.reason or None,
            }
        )
    return out
