from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import workspace_member, workspace_owner
from app.core.config import get_settings
from app.core.db import get_db
from app.models import Membership, Report, Workspace
from app.models.usage import UsageCall, WorkspaceBudget
from app.services import ai_usage, audit

router = APIRouter(prefix="/api/workspaces/{workspace_id}/usage", tags=["AI usage"])


@router.get("")
def summary(m: Membership = Depends(workspace_member), db: Session = Depends(get_db)):
    budget = db.get(WorkspaceBudget, m.workspace_id)
    records = db.scalars(
        select(UsageCall)
        .where(UsageCall.workspace_id == m.workspace_id, UsageCall.created_at >= ai_usage.month_start())
        .order_by(UsageCall.created_at.desc())
    ).all()
    estimate = sum((row.estimated_usd or Decimal(0)) for row in records if row.status == "COMPLETED")
    reserved = sum(row.reserved_usd for row in records if row.status != "COMPLETED")
    limit = budget.monthly_limit_usd if budget else Decimal(25)
    costs = db.execute(
        select(UsageCall.report_id, func.sum(UsageCall.estimated_usd))
        .join(Report, Report.id == UsageCall.report_id)
        .where(
            UsageCall.workspace_id == m.workspace_id,
            Report.status == "SUCCEEDED",
            UsageCall.status == "COMPLETED",
        )
        .group_by(UsageCall.report_id)
    ).all()
    measured = [float(cost) for _, cost in costs if cost is not None]
    return {
        "monthly_limit_usd": limit,
        "estimated_usd": estimate,
        "reserved_usd": reserved,
        "remaining_usd": max(Decimal(0), limit - estimate - reserved),
        "research_model": budget.research_model if budget else get_settings().research_model,
        "models": list(ai_usage.MODELS),
        "pricing_checked_at": "2026-10-18",
        "historical_report_estimate": {"low": min(measured), "high": max(measured), "samples": len(measured)}
        if measured
        else None,
        "records": [
            {
                "id": str(row.id),
                "report_id": row.report_id,
                "model": row.model,
                "operation": row.operation,
                "status": row.status,
                "estimated_usd": row.estimated_usd,
                "reserved_usd": row.reserved_usd,
                "tokens": row.usage,
                "created_at": row.created_at,
            }
            for row in records[:50]
        ],
        "note": (
            "Estimated API spend plus reservations for unfinished or unknown calls. "
            "Not a provider invoice or provider billing cap."
        ),
    }


class BudgetIn(BaseModel):
    monthly_limit_usd: Decimal = Field(ge=0, le=1000, decimal_places=4)
    research_model: Literal["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]


@router.patch("")
def update_budget(body: BudgetIn, m: Membership = Depends(workspace_owner), db: Session = Depends(get_db)):
    db.execute(select(Workspace.id).where(Workspace.id == m.workspace_id).with_for_update())
    row = db.get(WorkspaceBudget, m.workspace_id)
    if row is None:
        row = WorkspaceBudget(workspace_id=m.workspace_id)
        db.add(row)
    row.monthly_limit_usd, row.research_model = body.monthly_limit_usd, body.research_model
    audit.record(
        db,
        "workspace.budget",
        actor_id=m.user_id,
        workspace_id=m.workspace_id,
        detail={"monthly_limit_usd": str(row.monthly_limit_usd), "model": row.research_model},
    )
    db.commit()
    return {"saved": True}
