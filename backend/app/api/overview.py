"""Dashboard summary, integration status and workspace export."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.fo.base import FoUnavailable
from app.adapters.fo.factory import get_adapter
from app.api.deps import current_user, workspace_member, workspace_owner
from app.core.config import get_settings
from app.core.db import get_db, utcnow
from app.core.ratelimit import limiter
from app.models import (
    ActionRequest,
    DeliveryTracking,
    Evidence,
    Experiment,
    FunnelSnapshot,
    Interview,
    Membership,
    MessageVariant,
    OutcomeEvent,
    Prospect,
    Recommendation,
    Report,
    ReportEntry,
    ReportShare,
    Source,
    SuccessCriterion,
    UsageCall,
    User,
    WorkspaceBudget,
)
from app.models.connection import FoConnection
from app.models.enums import ActionStatus
from app.services import audit

router = APIRouter(prefix="/api/workspaces/{workspace_id}", tags=["overview"])


@router.get("/dashboard")
def dashboard(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    ws_id = m.workspace_id
    exps = db.scalars(
        select(Experiment)
        .where(Experiment.workspace_id == ws_id, Experiment.archived_at.is_(None))
        .order_by(Experiment.updated_at.desc())
    ).all()
    exp_ids = [e.id for e in exps]
    pending = db.scalars(
        select(ActionRequest).where(
            ActionRequest.workspace_id == ws_id,
            ActionRequest.status.in_([ActionStatus.PENDING_APPROVAL, ActionStatus.UNKNOWN]),
        )
    ).all()
    recent_outcomes = (
        db.scalars(
            select(OutcomeEvent)
            .where(OutcomeEvent.experiment_id.in_(exp_ids))
            .order_by(OutcomeEvent.occurred_at.desc())
            .limit(8)
        ).all()
        if exp_ids
        else []
    )
    latest_recs = {}
    for r in (
        db.scalars(
            select(Recommendation)
            .where(Recommendation.experiment_id.in_(exp_ids))
            .order_by(Recommendation.created_at.desc())
        ).all()
        if exp_ids
        else []
    ):
        latest_recs.setdefault(r.experiment_id, r)
    titles = {e.id: e.title for e in exps}
    return {
        "experiments": [
            {
                "id": str(e.id),
                "title": e.title,
                "use_case": e.use_case.value,
                "stage": e.stage.value,
                "is_demo": e.is_demo,
                "updated_at": e.updated_at,
                "latest_decision": latest_recs[e.id].decision.value if e.id in latest_recs else None,
            }
            for e in exps
        ],
        "pending_actions": [
            {
                "id": str(a.id),
                "experiment_id": str(a.experiment_id),
                "experiment_title": titles.get(a.experiment_id, ""),
                "kind": a.kind.value,
                "target": a.target,
                "status": a.status.value,
                "mode": a.mode,
            }
            for a in pending
        ],
        "recent_outcomes": [
            {
                "id": str(o.id),
                "experiment_id": str(o.experiment_id),
                "experiment_title": titles.get(o.experiment_id, ""),
                "kind": o.kind.value,
                "origin": o.origin.value,
                "occurred_at": o.occurred_at,
            }
            for o in recent_outcomes
        ],
        "recommendations": [
            {
                "experiment_id": str(eid),
                "experiment_title": titles.get(eid, ""),
                "decision": r.decision.value,
                "confidence": r.confidence,
                "next_action": r.next_action,
                "includes_demo_data": r.includes_demo_data,
                "created_at": r.created_at,
            }
            for eid, r in latest_recs.items()
        ],
    }


@router.get("/integrations")
def integrations(
    m: Membership = Depends(workspace_member),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    s = get_settings()
    limiter.check(f"integrations:{user.id}", limit=30, window_seconds=600)
    effective = "demo" if m.workspace.is_demo else s.fo_mode
    try:
        fo = get_adapter(effective, user_id=user.id).health()
    except FoUnavailable as exc:
        fo = {"mode": effective, "status": "not_configured", "detail": str(exc)}
    return {
        "environment": s.app_env,
        "fo": fo
        | {
            "verified_live": False,
            "workspace_forced_demo": m.workspace.is_demo,
            "account_connected": db.get(FoConnection, user.id) is not None,
            "oauth_configured": bool(s.connection_encryption_key),
        },
        "ai": {
            "enabled": s.ai_enabled,
            "model": s.anthropic_model if s.ai_enabled else None,
            "detail": None if s.ai_enabled else "ANTHROPIC_API_KEY not set; rule-based recommendations only.",
        },
        "checked_at": utcnow(),
    }


@router.get("/export")
def export(m: Membership = Depends(workspace_owner), db: Session = Depends(get_db)):
    """Owner-only JSON export of all workspace data (data portability)."""
    ws_id = m.workspace_id
    exps = db.scalars(select(Experiment).where(Experiment.workspace_id == ws_id)).all()
    ids = [e.id for e in exps]

    def rows(model):
        if not ids:
            return []
        return [
            {c.name: getattr(r, c.name) for c in model.__table__.columns}
            for r in db.scalars(select(model).where(model.experiment_id.in_(ids)))
        ]

    def scoped(model, condition, excluded=()):
        return [
            {c.name: getattr(r, c.name) for c in model.__table__.columns if c.name not in excluded}
            for r in db.scalars(select(model).where(condition))
        ]

    report_ids = select(Report.id).where(Report.workspace_id == ws_id)
    action_ids = select(ActionRequest.id).where(ActionRequest.workspace_id == ws_id)

    audit.record(db, "workspace.export", actor_id=m.user_id, workspace_id=ws_id)
    db.commit()
    return {
        "workspace": {"id": ws_id, "name": m.workspace.name, "is_demo": m.workspace.is_demo},
        "experiments": [{c.name: getattr(e, c.name) for c in Experiment.__table__.columns} for e in exps],
        "evidence": rows(Evidence),
        "prospects": rows(Prospect),
        "interviews": rows(Interview),
        "actions": rows(ActionRequest),
        "outcomes": rows(OutcomeEvent),
        "recommendations": rows(Recommendation),
        "sources": scoped(Source, Source.workspace_id == ws_id),
        "success_criteria": rows(SuccessCriterion),
        "messaging_variants": rows(MessageVariant),
        "funnel_snapshots": rows(FunnelSnapshot),
        "reports": scoped(Report, Report.workspace_id == ws_id),
        "report_entries": scoped(ReportEntry, ReportEntry.report_id.in_(report_ids)),
        "delivery_tracking": scoped(DeliveryTracking, DeliveryTracking.action_id.in_(action_ids)),
        "usage": scoped(UsageCall, UsageCall.workspace_id == ws_id),
        "budget": scoped(WorkspaceBudget, WorkspaceBudget.workspace_id == ws_id),
        "shares": scoped(ReportShare, ReportShare.report_id.in_(report_ids), ("token_hash", "snapshot")),
    }
