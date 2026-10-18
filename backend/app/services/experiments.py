import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import utcnow
from app.core.errors import AppError, NotFound
from app.models import (
    ActionRequest,
    AuditEvent,
    Evidence,
    Experiment,
    Interview,
    MessageVariant,
    OutcomeEvent,
    Prospect,
    Recommendation,
    SuccessCriterion,
    User,
    Workspace,
)
from app.models.enums import ActionStatus, Stage
from app.schemas.experiments import CriterionIn, ExperimentIn, ExperimentPatch
from app.services import audit, lifecycle


def log(db: Session, exp: Experiment, actor: User | None, action: str, **detail) -> None:
    """Audit + timeline entry scoped to an experiment."""
    audit.record(
        db,
        action,
        actor_id=actor.id if actor else None,
        workspace_id=exp.workspace_id,
        target_type="experiment",
        target_id=exp.id,
        detail={"experiment_id": str(exp.id), **detail},
    )


def get(db: Session, workspace_id: uuid.UUID, experiment_id: uuid.UUID) -> Experiment:
    """Load an experiment only if it belongs to the caller's workspace."""
    exp = db.scalar(
        select(Experiment).where(Experiment.id == experiment_id, Experiment.workspace_id == workspace_id)
    )
    if exp is None:
        raise NotFound("Experiment not found.")
    return exp


def list_for_workspace(db: Session, workspace_id: uuid.UUID, include_archived: bool = False):
    stmt = select(Experiment).where(Experiment.workspace_id == workspace_id)
    if not include_archived:
        stmt = stmt.where(Experiment.archived_at.is_(None))
    return db.scalars(stmt.order_by(Experiment.updated_at.desc())).all()


def create(db: Session, ws: Workspace, user: User, body: ExperimentIn) -> Experiment:
    exp = Experiment(
        workspace_id=ws.id,
        created_by=user.id,
        use_case=body.use_case,
        title=body.title.strip(),
        hypothesis=body.hypothesis.strip(),
        target_audience=body.target_audience.strip(),
        config=body.config,
        is_demo=ws.is_demo,
    )
    exp.criteria = [SuccessCriterion(**c.model_dump()) for c in body.criteria]
    db.add(exp)
    db.flush()
    log(db, exp, user, "experiment.create", use_case=body.use_case.value)
    db.commit()
    return exp


def update(db: Session, exp: Experiment, user: User, body: ExperimentPatch) -> Experiment:
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    for k, v in changes.items():
        setattr(exp, k, v.strip() if isinstance(v, str) else v)
    log(db, exp, user, "experiment.update", fields=sorted(changes))
    db.commit()
    return exp


def transition(db: Session, exp: Experiment, user: User, target: Stage, note: str = "") -> Experiment:
    if exp.archived_at:
        raise AppError("Archived experiments can't change stage.", code="archived")
    gate = lifecycle.can_transition(db, exp, target)
    if not gate.ok:
        raise AppError(gate.reason, code="transition_blocked")
    previous = exp.stage
    exp.stage = target
    log(db, exp, user, "experiment.stage", **{"from": previous.value, "to": target.value, "note": note})
    db.commit()
    return exp


def archive(db: Session, exp: Experiment, user: User) -> None:
    exp.archived_at = utcnow()
    pending = db.scalars(
        select(ActionRequest).where(
            ActionRequest.experiment_id == exp.id, ActionRequest.status == ActionStatus.PENDING_APPROVAL
        )
    ).all()
    for action in pending:
        action.status = ActionStatus.CANCELLED
    log(db, exp, user, "experiment.archive", cancelled_actions=len(pending))
    db.commit()


def add_criterion(db: Session, exp: Experiment, user: User, body: CriterionIn) -> SuccessCriterion:
    crit = SuccessCriterion(experiment_id=exp.id, **body.model_dump())
    db.add(crit)
    log(db, exp, user, "criterion.add", metric=body.metric, target=body.target)
    db.commit()
    return crit


def delete_criterion(db: Session, exp: Experiment, user: User, criterion_id: uuid.UUID) -> None:
    crit = db.scalar(
        select(SuccessCriterion).where(
            SuccessCriterion.id == criterion_id, SuccessCriterion.experiment_id == exp.id
        )
    )
    if crit is None:
        raise NotFound("Criterion not found.")
    db.delete(crit)
    log(db, exp, user, "criterion.delete", metric=crit.metric)
    db.commit()


def counts(db: Session, exp: Experiment) -> dict[str, int]:
    def c(model) -> int:
        return db.scalar(select(func.count()).where(model.experiment_id == exp.id)) or 0

    return {
        "evidence": c(Evidence),
        "prospects": c(Prospect),
        "interviews": c(Interview),
        "variants": c(MessageVariant),
        "actions": c(ActionRequest),
        "outcomes": c(OutcomeEvent),
        "recommendations": c(Recommendation),
    }


def timeline(db: Session, exp: Experiment, limit: int = 100):
    return db.execute(
        select(AuditEvent, User.name)
        .outerjoin(User, User.id == AuditEvent.actor_id)
        .where(
            AuditEvent.workspace_id == exp.workspace_id,
            AuditEvent.target_type == "experiment",
            AuditEvent.target_id == str(exp.id),
        )
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
    ).all()
