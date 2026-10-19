"""Company report lifecycle: request -> background generation -> validated report."""

import logging
import threading
import uuid
from contextlib import suppress
from datetime import timedelta

import anthropic
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import new_session, utcnow
from app.core.errors import AppError, NotFound
from app.models import Report, User, Workspace
from app.schemas.report import ReportIn
from app.services import ai_usage, audit, entitlements, fetcher, report_research, report_validate
from app.services.report_worker import LEASE, eligible, heartbeat

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
    db.execute(select(Workspace.id).where(Workspace.id == ws.id).with_for_update())
    if not get_settings().ai_enabled:
        raise AppError("AI research is unavailable. Please contact the workspace operator.", "ai_disabled")
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
        model="claude-haiku-5-5",
    )
    db.add(report)
    db.flush()
    report.billing_use_id = entitlements.reserve(db, ws.id, "research", f"report:{report.id}")
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


class JobStopped(Exception):
    pass


def _set(db: Session, report_id: uuid.UUID, owner=None, **values) -> None:
    statement = update(Report).where(Report.id == report_id)
    if owner is not None:
        statement = statement.where(Report.lease_owner == owner, Report.status == "RUNNING")
    result = db.execute(statement.values(**values))
    if owner is not None and result.rowcount != 1:
        db.rollback()
        raise JobStopped
    if values.get("status") in ("FAILED", "CANCELLED"):
        entitlements.finish(db, db.get(Report, report_id).billing_use_id, False)
    db.commit()


def run(report_id: uuid.UUID) -> None:
    """Background job. Uses its own session; never raises."""
    db = new_session()
    owner = uuid.uuid4().hex
    stop = threading.Event()
    usage_token = None
    billing_token = None
    try:
        claimed = db.execute(
            update(Report)
            .where(Report.id == report_id, eligible())
            .values(
                status="RUNNING",
                started_at=utcnow(),
                lease_owner=owner,
                lease_until=utcnow() + LEASE,
                attempts=Report.attempts + 1,
                progress="Reading the company website…",
                error=None,
            )
        )
        db.commit()
        if claimed.rowcount != 1:
            return
        report = db.get(Report, report_id)
        if report.billing_use_id is None:
            report.billing_use_id = entitlements.reserve(db, report.workspace_id, "research")
            db.commit()
        billing_token = ai_usage.BILLING_USE.set(report.billing_use_id)
        usage_token = ai_usage.CONTEXT.set((report.workspace_id, report.id, "claude-haiku-5-5"))
        if report.attempts > 3:
            _set(
                db,
                report_id,
                owner,
                status="FAILED",
                error="Repeated interruptions. Please retry this report.",
            )
            return
        threading.Thread(target=heartbeat, args=(report_id, owner, stop), daemon=True).start()
        checkpoint = dict(report.checkpoint or {})
        inputs = dict(report.inputs, company_name=report.company_name)

        if "site" not in checkpoint:
            try:
                page = fetcher.fetch(report.company_url)
                checkpoint["site"] = {
                    "text": f"{page.title}\n{page.text}",
                    "source": {
                        "id": "S0",
                        "url": page.url,
                        "title": page.title or "Company website",
                        "via": "pursuit_fetch",
                    },
                }
            except fetcher.FetchError as exc:
                checkpoint["site"] = {
                    "text": "",
                    "note": f"Pursuit could not read the website directly: {exc.message}",
                }
            _set(db, report_id, owner, checkpoint=checkpoint)
        site = checkpoint["site"]
        site_text = site["text"]
        if site.get("note"):
            inputs["website_note"] = site["note"]
        if "research" not in checkpoint:
            found = report_research.research(
                report.company_url,
                site_text,
                inputs,
                on_progress=lambda p: _set(db, report_id, owner, progress=p),
            )
            if site.get("source"):
                found.sources.insert(0, site["source"])
            found.sources.extend(checkpoint.get("base_sources", []))
            checkpoint["research"] = {"notes": found.notes, "sources": found.sources}
            _set(db, report_id, owner, checkpoint=checkpoint)
        found = report_research.Research(**checkpoint["research"])
        _set(db, report_id, owner, progress=f"Writing the report from {len(found.sources)} sources…")
        if checkpoint.get("sections"):
            content = report_research.synthesize(
                report.company_url,
                site_text,
                inputs,
                found,
                base=checkpoint["base_content"],
                sections=checkpoint["sections"],
            )
        else:
            content = report_research.synthesize(report.company_url, site_text, inputs, found)
        data, stats = report_validate.validate(content, found.sources)
        # A cancelled or reclaimed job must never overwrite its replacement.
        db.refresh(report)
        if report.status != "RUNNING" or report.lease_owner != owner:
            return
        completed = db.execute(
            update(Report)
            .where(
                Report.id == report_id,
                Report.status == "RUNNING",
                Report.lease_owner == owner,
            )
            .values(
                company_name=report.company_name or data["snapshot"]["name"][:160],
                content=data,
                sources=found.sources,
                model=ai_usage.model(get_settings().research_model),
                status="SUCCEEDED",
                progress="Done",
                finished_at=utcnow(),
                lease_until=None,
            )
        )
        if completed.rowcount != 1:
            db.rollback()
            return
        audit.record(
            db,
            "report.complete",
            actor_id=None,
            workspace_id=report.workspace_id,
            target_type="report",
            target_id=report.id,
            detail={"sources": len(found.sources), **stats},
        )
        entitlements.finish(db, report.billing_use_id, True)
        db.commit()
    except JobStopped:
        db.rollback()
    except (anthropic.APIConnectionError, anthropic.RateLimitError):
        db.rollback()
        if report.attempts < 3:
            _set(
                db,
                report_id,
                owner,
                status="QUEUED",
                progress="Temporary provider problem. Retrying…",
                lease_until=None,
            )
        else:
            _set(
                db,
                report_id,
                owner,
                status="FAILED",
                error="The AI service is unavailable. Please retry later.",
            )
    except report_research.ResearchError as exc:
        db.rollback()
        with suppress(JobStopped):
            _set(
                db, report_id, owner, status="FAILED", progress="Failed", error=str(exc), finished_at=utcnow()
            )
    except AppError as exc:
        db.rollback()
        with suppress(JobStopped):
            _set(
                db,
                report_id,
                owner,
                status="FAILED",
                progress="Failed",
                error=exc.message,
                finished_at=utcnow(),
            )
    except Exception:
        logger.exception("Report %s failed", report_id)
        db.rollback()
        with suppress(JobStopped):
            _set(
                db,
                report_id,
                owner,
                status="FAILED",
                progress="Failed",
                error="Something went wrong while generating the report. Please try again.",
                finished_at=utcnow(),
            )
    finally:
        if billing_token is not None:
            ai_usage.BILLING_USE.reset(billing_token)
        if usage_token is not None:
            ai_usage.CONTEXT.reset(usage_token)
        stop.set()
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


def cancel(db, report, user):
    from app.core.errors import Conflict

    result = db.execute(
        update(Report)
        .where(Report.id == report.id, Report.status.in_(ACTIVE))
        .values(
            status="CANCELLED", progress="Cancelled", lease_owner=None, lease_until=None, finished_at=utcnow()
        )
    )
    if not result.rowcount:
        raise Conflict("Only queued or running reports can be cancelled.")
    entitlements.finish(db, report.billing_use_id, False)
    audit.record(db, "report.cancel", actor_id=user.id, workspace_id=report.workspace_id, target_id=report.id)
    db.commit()
    db.refresh(report)
    return report


def retry(db, report, user):
    from app.core.errors import Conflict

    db.execute(select(Workspace.id).where(Workspace.id == report.workspace_id).with_for_update())
    if report.status not in ("FAILED", "CANCELLED"):
        raise Conflict("Only failed or cancelled reports can be retried.")
    if db.scalar(
        select(Report.id).where(Report.workspace_id == report.workspace_id, Report.status.in_(ACTIVE))
    ):
        raise Conflict("A report is already running in this workspace.")
    use_id = entitlements.reserve(db, report.workspace_id, "research")
    result = db.execute(
        update(Report)
        .where(Report.id == report.id, Report.status.in_(["FAILED", "CANCELLED"]))
        .values(
            status="QUEUED",
            progress="Queued to resume saved progress",
            attempts=0,
            lease_owner=None,
            lease_until=None,
            finished_at=None,
            error=None,
            billing_use_id=use_id,
        )
    )
    if not result.rowcount:
        raise Conflict("Only failed or cancelled reports can be retried.")
    audit.record(db, "report.retry", actor_id=user.id, workspace_id=report.workspace_id, target_id=report.id)
    db.commit()
    db.refresh(report)
    return report


def _min_len(text: str, n: int, prefix: str) -> str:
    """Model output can be terse; keep it but satisfy experiment validation."""
    text = (text or "").strip()
    return text if len(text) >= n else f"{prefix}: {text}".strip(": ")


def to_experiment(db: Session, ws: Workspace, user: User, report: Report, index: int):
    """Create a tracked experiment from one of the report's recommended experiments,
    carrying over sourced facts as evidence (with their URLs) so provenance survives."""
    from app.models import Evidence, Source
    from app.models.enums import DataOrigin, EvidenceKind, Stance
    from app.schemas.experiments import CriterionIn, ExperimentIn
    from app.services import experiments

    if report.status != "SUCCEEDED" or not report.content:
        raise AppError("This report isn't finished yet.", "not_ready")
    ideas = report.content.get("experiments", [])
    if not 0 <= index < len(ideas):
        raise NotFound("Experiment idea not found.")
    idea = ideas[index]
    segment = (report.content.get("segments") or [{}])[0]
    exp = experiments.create(
        db,
        ws,
        user,
        ExperimentIn(
            use_case=idea["use_case"],
            title=_min_len(idea["title"], 3, "Experiment")[:160],
            hypothesis=_min_len(idea["hypothesis"], 10, "Hypothesis from report")[:4000],
            target_audience=f"{segment.get('name', '')}: {segment.get('description', '')}"[:2000],
            config={"from_report": str(report.id), "why_first": idea.get("why_first", "")},
            criteria=[
                CriterionIn(
                    metric=idea["metric"],
                    comparator=idea["comparator"],
                    target=idea["target"],
                    min_sample=idea["min_sample"],
                )
            ],
        ),
    )
    by_id = {s["id"]: s for s in report.sources}
    c = report.content
    stance_groups = [
        (c["snapshot"]["key_facts"] + c["snapshot"]["observed_pricing"], Stance.NEUTRAL),
        ([x for p in c["problems"] for x in p["supporting"]], Stance.SUPPORTS),
        ([x for p in c["problems"] for x in p["against"]], Stance.CONTRADICTS),
    ]
    added = 0
    for claims, stance in stance_groups:
        for cl in claims:
            if added >= 15 or not cl.get("source_ids"):
                continue
            src_meta = by_id.get(cl["source_ids"][0])
            if not src_meta:
                continue
            src = Source(
                workspace_id=ws.id,
                experiment_id=exp.id,
                url=src_meta["url"][:2048],
                title=src_meta.get("title", "")[:300],
                origin=DataOrigin.AI,
                excerpt=f"Cited in Pursuit report for {report.company_name or report.company_url}",
            )
            db.add(src)
            db.flush()
            kind = EvidenceKind.OBSERVED_FACT if cl["kind"] == "fact" else EvidenceKind.INTERPRETATION
            db.add(
                Evidence(
                    experiment_id=exp.id,
                    source_id=src.id,
                    kind=kind,
                    stance=stance,
                    claim=cl["text"][:4000],
                    relevance=0.6,
                    tags=["from-report"],
                    origin=DataOrigin.AI,
                )
            )
            added += 1
    experiments.log(db, exp, user, "experiment.from_report", report_id=str(report.id), evidence=added)
    db.commit()
    return exp
