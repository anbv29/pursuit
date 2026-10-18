"""Company report lifecycle: request -> background generation -> validated report."""

import logging
import uuid
from datetime import timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.core.errors import AppError, NotFound
from app.models import Report, User, Workspace
from app.schemas.report import ReportIn
from app.services import audit, fetcher, report_research, report_validate

logger = logging.getLogger("pursuit.reports")
ACTIVE = ("QUEUED", "RUNNING")
DAILY_LIMIT = 20
STALE_AFTER = timedelta(minutes=30)


def get(db: Session, workspace_id: uuid.UUID, report_id: uuid.UUID) -> Report:
    r = db.scalar(select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id))
    if r is None:
        raise NotFound("Report not found.")
    return r


def list_for_workspace(db: Session, workspace_id: uuid.UUID):
    return db.scalars(
        select(Report).where(Report.workspace_id == workspace_id).order_by(Report.created_at.desc()).limit(50)
    ).all()


def create(db: Session, ws: Workspace, user: User, body: ReportIn) -> Report:
    if not get_settings().ai_enabled:
        raise AppError(
            "Reports need AI research, but ANTHROPIC_API_KEY isn't set on the server.", "ai_disabled"
        )
    running = db.scalar(
        select(func.count(Report.id)).where(Report.workspace_id == ws.id, Report.status.in_(ACTIVE))
    )
    if running:
        raise AppError("A report is already being generated in this workspace. Please wait for it.", "busy")
    today = db.scalar(
        select(func.count(Report.id)).where(
            Report.workspace_id == ws.id, Report.created_at >= utcnow() - timedelta(days=1)
        )
    )
    if (today or 0) >= DAILY_LIMIT:
        raise AppError("Daily report limit reached for this workspace.", "budget_exceeded")
    inputs = body.model_dump(mode="json", exclude={"company_url", "company_name"})
    report = Report(
        workspace_id=ws.id,
        created_by=user.id,
        company_url=str(body.company_url),
        company_name=body.company_name.strip(),
        inputs={k: v for k, v in inputs.items() if v},
    )
    db.add(report)
    db.flush()
    audit.record(
        db,
        "report.request",
        actor_id=user.id,
        workspace_id=ws.id,
        target_type="report",
        target_id=report.id,
        detail={"url": report.company_url},
    )
    db.commit()
    return report


def _set(db: Session, report_id: uuid.UUID, **values) -> None:
    db.execute(update(Report).where(Report.id == report_id).values(**values))
    db.commit()


def run(report_id: uuid.UUID) -> None:
    """Background job. Uses its own session; never raises."""
    db = new_session()
    try:
        claimed = db.execute(
            update(Report)
            .where(Report.id == report_id, Report.status == "QUEUED")
            .values(status="RUNNING", started_at=utcnow(), progress="Reading the company website…")
        )
        db.commit()
        if claimed.rowcount != 1:
            return
        report = db.get(Report, report_id)
        inputs = dict(report.inputs, company_name=report.company_name)

        site_text, site_source = "", None
        try:
            page = fetcher.fetch(report.company_url)
            site_text = f"{page.title}\n{page.text}"
            site_source = {
                "id": "S0",
                "url": page.url,
                "title": page.title or "Company website",
                "via": "pursuit_fetch",
            }
        except fetcher.FetchError as exc:
            inputs["website_note"] = f"Pursuit could not read the website directly: {exc.message}"

        found = report_research.research(
            report.company_url, site_text, inputs, on_progress=lambda p: _set(db, report_id, progress=p)
        )
        if site_source:
            found.sources.insert(0, site_source)
        _set(db, report_id, progress=f"Writing the report from {len(found.sources)} sources…")
        content = report_research.synthesize(report.company_url, site_text, inputs, found)
        data, stats = report_validate.validate(content, found.sources)
        if not report.company_name:
            report.company_name = data["snapshot"]["name"][:160]
        report.content = data
        report.sources = found.sources
        report.model = get_settings().anthropic_model
        report.status, report.progress, report.finished_at = "SUCCEEDED", "Done", utcnow()
        audit.record(
            db,
            "report.complete",
            actor_id=None,
            workspace_id=report.workspace_id,
            target_type="report",
            target_id=report.id,
            detail={"sources": len(found.sources), **stats},
        )
        db.commit()
    except report_research.ResearchError as exc:
        db.rollback()
        _set(db, report_id, status="FAILED", progress="Failed", error=str(exc), finished_at=utcnow())
    except Exception:
        logger.exception("Report %s failed", report_id)
        db.rollback()
        _set(
            db,
            report_id,
            status="FAILED",
            progress="Failed",
            error="Something went wrong while generating the report. Please try again.",
            finished_at=utcnow(),
        )
    finally:
        db.close()


def recover_stale(db: Session) -> int:
    """Mark jobs orphaned by a server restart as failed instead of spinning forever."""
    res = db.execute(
        update(Report)
        .where(Report.status.in_(ACTIVE), Report.created_at < utcnow() - STALE_AFTER)
        .values(
            status="FAILED",
            progress="Failed",
            error="Interrupted (server restarted). Please run it again.",
            finished_at=utcnow(),
        )
    )
    db.commit()
    return res.rowcount
