import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.api.experiments import experiment_dep
from app.core.db import get_db
from app.models import Experiment, Membership, User
from app.models.enums import Role
from app.schemas.discovery import (
    InterviewIn,
    InterviewOut,
    OutcomeIn,
    OutcomeOut,
    ProspectIn,
    ProspectOut,
    ProspectPatch,
    VariantIn,
    VariantOut,
)
from app.services import discovery as svc

router = APIRouter(prefix="/api/workspaces/{workspace_id}/experiments/{experiment_id}", tags=["discovery"])


def _prospect_view(p, m: Membership) -> ProspectOut:
    out = ProspectOut.model_validate(p)
    if m.role != Role.OWNER:  # contact details are owner-only
        out.email = svc.mask_email(out.email)
    return out


@router.get("/prospects", response_model=list[ProspectOut])
def list_prospects(
    exp: Experiment = Depends(experiment_dep),
    m: Membership = Depends(workspace_member),
    db: Session = Depends(get_db),
):
    return [_prospect_view(p, m) for p in svc.list_prospects(db, exp)]


@router.post("/prospects", response_model=ProspectOut, status_code=201)
def add_prospect(
    body: ProspectIn,
    exp: Experiment = Depends(experiment_dep),
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return _prospect_view(svc.add_prospect(db, exp, user, body), m)


@router.patch("/prospects/{prospect_id}", response_model=ProspectOut)
def update_prospect(
    prospect_id: uuid.UUID,
    body: ProspectPatch,
    exp: Experiment = Depends(experiment_dep),
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return _prospect_view(svc.update_prospect(db, exp, user, prospect_id, body), m)


@router.delete("/prospects/{prospect_id}", status_code=204)
def delete_prospect(
    prospect_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    svc.delete_prospect(db, exp, user, prospect_id)


@router.get("/interviews", response_model=list[InterviewOut])
def list_interviews(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return svc.list_interviews(db, exp)


@router.post("/interviews", response_model=InterviewOut, status_code=201)
def add_interview(
    body: InterviewIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return svc.save_interview(db, exp, user, body)


@router.patch("/interviews/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: uuid.UUID,
    body: InterviewIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return svc.save_interview(db, exp, user, body, interview_id)


@router.get("/variants", response_model=list[VariantOut])
def list_variants(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return svc.list_variants(db, exp)


@router.post("/variants", response_model=VariantOut, status_code=201)
def add_variant(
    body: VariantIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return svc.add_variant(db, exp, user, body)


@router.get("/outcomes", response_model=list[OutcomeOut])
def list_outcomes(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return svc.list_outcomes(db, exp)


@router.post("/outcomes", response_model=OutcomeOut, status_code=201)
def record_outcome(
    body: OutcomeIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return svc.record_outcome(db, exp, user, body)


@router.delete("/outcomes/{outcome_id}", status_code=204)
def delete_outcome(
    outcome_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    svc.delete_outcome(db, exp, user, outcome_id)
