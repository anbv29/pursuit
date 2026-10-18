import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.core.errors import AppError
from app.core.ratelimit import limiter
from app.models import Experiment, User
from app.models.enums import DataOrigin, Decision
from app.schemas.common import ORM
from app.services import funnel, recommendations

router = APIRouter(prefix="/api/workspaces/{workspace_id}/experiments/{experiment_id}", tags=["analysis"])


class RecommendationOut(ORM):
    id: uuid.UUID
    decision: Decision
    confidence: float
    rationale: str
    assumptions: list
    counterevidence: list
    limitations: list
    next_action: str
    evidence_ids: list
    metrics_snapshot: dict
    generated_by: str
    includes_demo_data: bool
    created_at: datetime


class GenerateIn(BaseModel):
    use_ai: bool = True


class StageIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    count: int = Field(ge=0, le=10**12)


class FunnelIn(BaseModel):
    label: str = Field(default="Manual entry", max_length=120)
    stages: list[StageIn] = Field(min_length=2, max_length=funnel.MAX_STAGES)


@router.get("/analysis")
def get_analysis(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return recommendations.analysis(db, exp)


@router.get("/recommendations", response_model=list[RecommendationOut])
def list_recommendations(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return recommendations.list_for_experiment(db, exp)


@router.post("/recommendations", response_model=RecommendationOut, status_code=201)
def generate(
    body: GenerateIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"recommend:{user.id}", limit=20, window_seconds=3600)
    return recommendations.generate(db, exp, user, use_ai=body.use_ai)


def _store(db, exp, user, stages: list[dict], label: str, origin: DataOrigin, warnings: list[str]):
    res = funnel.ParseResult(stages=stages)
    funnel.validate(res)
    if res.errors:
        raise AppError(" ".join(res.errors), code="invalid_funnel")
    recommendations.save_funnel(db, exp, user, stages, label, origin)
    return {"analysis": funnel.analyze(stages), "warnings": warnings + res.warnings}


@router.post("/funnel", status_code=201)
def save_funnel(
    body: FunnelIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    stages = [s.model_dump() for s in body.stages]
    return _store(db, exp, user, stages, body.label, DataOrigin.MANUAL, [])


@router.post("/funnel/import", status_code=201)
async def import_funnel(
    file: UploadFile = File(...),
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    raw = await file.read(funnel.MAX_CSV_BYTES + 1)
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise AppError("Please upload a .csv file.", code="invalid_funnel")
    parsed = funnel.parse_csv(raw)
    if parsed.errors:
        raise AppError(" ".join(parsed.errors[:10]), code="invalid_funnel")
    return _store(
        db, exp, user, parsed.stages, file.filename or "CSV import", DataOrigin.IMPORT, parsed.warnings
    )
