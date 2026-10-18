import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import Conflict, NotFound
from app.models import Experiment, Interview, MessageVariant, OutcomeEvent, Prospect, User
from app.models.enums import DataOrigin
from app.schemas.discovery import InterviewIn, OutcomeIn, ProspectIn, ProspectPatch, VariantIn
from app.services.experiments import log


def _origin(exp: Experiment) -> DataOrigin:
    return DataOrigin.DEMO if exp.is_demo else DataOrigin.MANUAL


def _owned(db: Session, model, exp: Experiment, obj_id: uuid.UUID | None):
    if obj_id is None:
        return None
    obj = db.scalar(select(model).where(model.id == obj_id, model.experiment_id == exp.id))
    if obj is None:
        raise NotFound(f"{model.__name__} not found.")
    return obj


def mask_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


# ---- prospects ---------------------------------------------------------------
def list_prospects(db: Session, exp: Experiment):
    return db.scalars(
        select(Prospect).where(Prospect.experiment_id == exp.id).order_by(Prospect.created_at)
    ).all()


def add_prospect(db: Session, exp: Experiment, user: User, body: ProspectIn) -> Prospect:
    data = body.model_dump()
    data["source_url"] = str(body.source_url) if body.source_url else None
    p = Prospect(workspace_id=exp.workspace_id, experiment_id=exp.id, origin=_origin(exp), **data)
    db.add(p)
    db.flush()
    log(db, exp, user, "prospect.add", prospect_id=str(p.id), name=p.name)
    db.commit()
    return p


def update_prospect(
    db: Session, exp: Experiment, user: User, pid: uuid.UUID, body: ProspectPatch
) -> Prospect:
    p = _owned(db, Prospect, exp, pid)
    changes = body.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(p, k, v)
    log(db, exp, user, "prospect.update", prospect_id=str(p.id), **changes)
    db.commit()
    return p


def delete_prospect(db: Session, exp: Experiment, user: User, pid: uuid.UUID) -> None:
    p = _owned(db, Prospect, exp, pid)
    db.delete(p)
    log(db, exp, user, "prospect.delete", prospect_id=str(pid))
    db.commit()


# ---- interviews --------------------------------------------------------------
def list_interviews(db: Session, exp: Experiment):
    return db.scalars(
        select(Interview).where(Interview.experiment_id == exp.id).order_by(Interview.created_at)
    ).all()


def save_interview(
    db: Session, exp: Experiment, user: User, body: InterviewIn, interview_id: uuid.UUID | None = None
) -> Interview:
    _owned(db, Prospect, exp, body.prospect_id)
    data = body.model_dump()
    data["pain_points"] = [p.strip()[:200] for p in body.pain_points if p.strip()]
    if interview_id:
        iv = _owned(db, Interview, exp, interview_id)
        for k, v in data.items():
            setattr(iv, k, v)
    else:
        iv = Interview(experiment_id=exp.id, origin=_origin(exp), **data)
        db.add(iv)
    db.flush()
    log(db, exp, user, "interview.save", interview_id=str(iv.id), status=iv.status, wtp=iv.wtp_signal)
    db.commit()
    return iv


# ---- variants ----------------------------------------------------------------
def list_variants(db: Session, exp: Experiment):
    return db.scalars(
        select(MessageVariant).where(MessageVariant.experiment_id == exp.id).order_by(MessageVariant.label)
    ).all()


def add_variant(db: Session, exp: Experiment, user: User, body: VariantIn) -> MessageVariant:
    v = MessageVariant(experiment_id=exp.id, **body.model_dump())
    db.add(v)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise Conflict("A variant with that label already exists.") from exc
    log(db, exp, user, "variant.add", label=v.label)
    db.commit()
    return v


# ---- outcomes ----------------------------------------------------------------
def list_outcomes(db: Session, exp: Experiment):
    return db.scalars(
        select(OutcomeEvent).where(OutcomeEvent.experiment_id == exp.id).order_by(OutcomeEvent.occurred_at)
    ).all()


def record_outcome(db: Session, exp: Experiment, user: User, body: OutcomeIn) -> OutcomeEvent:
    _owned(db, MessageVariant, exp, body.variant_id)
    _owned(db, Prospect, exp, body.prospect_id)
    data = body.model_dump(exclude_none=True)
    ev = OutcomeEvent(experiment_id=exp.id, origin=_origin(exp), recorded_by=user.id, **data)
    db.add(ev)
    db.flush()
    log(db, exp, user, "outcome.record", kind=body.kind.value, origin=ev.origin.value)
    db.commit()
    return ev


def delete_outcome(db: Session, exp: Experiment, user: User, outcome_id: uuid.UUID) -> None:
    ev = _owned(db, OutcomeEvent, exp, outcome_id)
    db.delete(ev)
    log(db, exp, user, "outcome.delete", kind=ev.kind.value)
    db.commit()
