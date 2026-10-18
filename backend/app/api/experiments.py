import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, workspace_member
from app.core.db import get_db
from app.models import Experiment, Membership, User
from app.schemas.experiments import (
    CriterionIn,
    CriterionOut,
    ExperimentDetail,
    ExperimentIn,
    ExperimentOut,
    ExperimentPatch,
    StageStatus,
    TimelineItem,
    TransitionIn,
)
from app.services import experiments, lifecycle, use_cases

router = APIRouter(prefix="/api/workspaces/{workspace_id}/experiments", tags=["experiments"])
templates_router = APIRouter(prefix="/api/use-cases", tags=["experiments"])


@templates_router.get("")
def list_use_cases():
    return use_cases.public_templates()


def experiment_dep(
    experiment_id: uuid.UUID, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)
) -> Experiment:
    return experiments.get(db, m.workspace_id, experiment_id)


def _detail(db: Session, exp: Experiment) -> ExperimentDetail:
    return ExperimentDetail(
        **ExperimentOut.model_validate(exp).model_dump(),
        stages=[StageStatus(**s) for s in lifecycle.stage_checklist(db, exp)],
        counts=experiments.counts(db, exp),
    )


@router.get("", response_model=list[ExperimentOut])
def list_experiments(
    include_archived: bool = False, m: Membership = Depends(workspace_member), db: Session = Depends(get_db)
):
    return experiments.list_for_workspace(db, m.workspace_id, include_archived)


@router.post("", response_model=ExperimentDetail, status_code=201)
def create_experiment(
    body: ExperimentIn,
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return _detail(db, experiments.create(db, m.workspace, user, body))


@router.get("/{experiment_id}", response_model=ExperimentDetail)
def get_experiment(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return _detail(db, exp)


@router.patch("/{experiment_id}", response_model=ExperimentDetail)
def update_experiment(
    body: ExperimentPatch,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return _detail(db, experiments.update(db, exp, user, body))


@router.post("/{experiment_id}/transition", response_model=ExperimentDetail)
def transition(
    body: TransitionIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return _detail(db, experiments.transition(db, exp, user, body.to, body.note))


@router.post("/{experiment_id}/archive", status_code=204)
def archive(
    exp: Experiment = Depends(experiment_dep), user: User = Depends(current_user), db=Depends(get_db)
):
    experiments.archive(db, exp, user)


@router.post("/{experiment_id}/criteria", response_model=CriterionOut, status_code=201)
def add_criterion(
    body: CriterionIn,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return experiments.add_criterion(db, exp, user, body)


@router.delete("/{experiment_id}/criteria/{criterion_id}", status_code=204)
def delete_criterion(
    criterion_id: uuid.UUID,
    exp: Experiment = Depends(experiment_dep),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    experiments.delete_criterion(db, exp, user, criterion_id)


@router.get("/{experiment_id}/timeline", response_model=list[TimelineItem])
def timeline(exp: Experiment = Depends(experiment_dep), db: Session = Depends(get_db)):
    return [
        TimelineItem(id=e.id, action=e.action, actor_name=name, detail=e.detail, created_at=e.created_at)
        for e, name in experiments.timeline(db, exp)
    ]
