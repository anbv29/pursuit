import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import NotFound
from app.models import Evidence, Experiment, Source, User
from app.models.enums import DataOrigin
from app.schemas.evidence import EvidenceIn
from app.services.experiments import log


def _origin(exp: Experiment, default: DataOrigin) -> DataOrigin:
    return DataOrigin.DEMO if exp.is_demo else default


def add_source(
    db: Session,
    exp: Experiment,
    user: User | None,
    *,
    url: str,
    title: str = "",
    excerpt: str = "",
    content_sha256: str | None = None,
    origin: DataOrigin = DataOrigin.MANUAL,
) -> Source:
    src = Source(
        workspace_id=exp.workspace_id,
        experiment_id=exp.id,
        url=url,
        title=title.strip()[:300],
        excerpt=excerpt.strip()[:8000],
        content_sha256=content_sha256,
        origin=_origin(exp, origin),
    )
    db.add(src)
    db.flush()
    log(db, exp, user, "source.add", url=url, origin=src.origin.value)
    db.commit()
    return src


def list_sources(db: Session, exp: Experiment):
    return db.scalars(
        select(Source).where(Source.experiment_id == exp.id).order_by(Source.retrieved_at.desc())
    ).all()


def add_evidence(
    db: Session, exp: Experiment, user: User | None, body: EvidenceIn, origin: DataOrigin = DataOrigin.MANUAL
) -> Evidence:
    if body.source_id is not None:
        # Source must belong to this same experiment — prevents cross-tenant linking.
        owned = db.scalar(
            select(Source.id).where(Source.id == body.source_id, Source.experiment_id == exp.id)
        )
        if owned is None:
            raise NotFound("Source not found.")
    ev = Evidence(
        experiment_id=exp.id,
        created_by=user.id if user else None,
        origin=_origin(exp, origin),
        **body.model_dump(),
    )
    db.add(ev)
    db.flush()
    log(db, exp, user, "evidence.add", kind=body.kind.value, stance=body.stance.value)
    db.commit()
    return get_evidence(db, exp, ev.id)


def get_evidence(db: Session, exp: Experiment, evidence_id: uuid.UUID) -> Evidence:
    ev = db.scalar(
        select(Evidence)
        .options(joinedload(Evidence.source))
        .where(Evidence.id == evidence_id, Evidence.experiment_id == exp.id)
    )
    if ev is None:
        raise NotFound("Evidence not found.")
    return ev


def list_evidence(db: Session, exp: Experiment):
    return db.scalars(
        select(Evidence)
        .options(joinedload(Evidence.source))
        .where(Evidence.experiment_id == exp.id)
        .order_by(Evidence.relevance.desc(), Evidence.created_at.desc())
    ).all()


def delete_evidence(db: Session, exp: Experiment, user: User, evidence_id: uuid.UUID) -> None:
    ev = get_evidence(db, exp, evidence_id)
    db.delete(ev)
    log(db, exp, user, "evidence.delete", claim=ev.claim[:80])
    db.commit()
