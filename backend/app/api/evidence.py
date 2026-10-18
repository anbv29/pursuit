import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Experiment, User
from app.models.enums import DataOrigin
from app.schemas.evidence import EvidenceIn, EvidenceOut, FetchIn, SourceIn, SourceOut
from app.services import evidence, fetcher

router = APIRouter(prefix="/api/workspaces/{workspace_id}/experiments/{experiment_id}", tags=["evidence"])


@router.get("/sources", response_model=list[SourceOut])
def list_sources(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return evidence.list_sources(db, exp)


@router.post("/sources", response_model=SourceOut, status_code=201)
def add_source(
    body: SourceIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return evidence.add_source(db, exp, user, url=str(body.url), title=body.title, excerpt=body.excerpt)


@router.post("/sources/fetch", response_model=SourceOut, status_code=201)
def fetch_source(
    body: FetchIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Fetch a public page server-side and store it as a source with provenance."""
    limiter.check(f"fetch:{user.id}", limit=30, window_seconds=600)
    page = fetcher.fetch(str(body.url))
    return evidence.add_source(
        db,
        exp,
        user,
        url=page.url,
        title=page.title,
        excerpt=page.text,
        content_sha256=page.sha256,
        origin=DataOrigin.IMPORT,
    )


@router.get("/evidence", response_model=list[EvidenceOut])
def list_evidence(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return evidence.list_evidence(db, exp)


@router.post("/evidence", response_model=EvidenceOut, status_code=201)
def add_evidence(
    body: EvidenceIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return evidence.add_evidence(db, exp, user, body)


@router.delete("/evidence/{evidence_id}", status_code=204)
def delete_evidence(
    evidence_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    evidence.delete_evidence(db, exp, user, evidence_id)
