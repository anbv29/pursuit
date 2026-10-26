import uuid
from copy import deepcopy

from sqlalchemy import select

from app.core.db import utcnow
from app.core.errors import AppError, NotFound
from app.models import Report, Workspace
from app.models.report_entry import ReportEntry
from app.schemas.report import ReportContent

SECTIONS = set(ReportContent.model_fields)


def versions(db, report):
    return db.scalars(
        select(ReportEntry)
        .where(ReportEntry.report_id == report.id, ReportEntry.kind == "version")
        .order_by(ReportEntry.created_at.desc())
        .limit(30)
    ).all()


def refresh(db, report, user, correction, sections, *, gtm_constraints=None, research_urls=None):
    db.execute(select(Workspace.id).where(Workspace.id == report.workspace_id).with_for_update())
    db.refresh(report)
    if report.status != "SUCCEEDED" or not report.content:
        raise AppError("Only a finished report can be refreshed.")
    if db.scalar(
        select(Report.id).where(
            Report.workspace_id == report.workspace_id, Report.status.in_(["QUEUED", "RUNNING"])
        )
    ):
        raise AppError("Another report is already running in this workspace.")
    if not sections or not set(sections) <= SECTIONS:
        raise AppError("Select one or more supported report sections.")
    sections = list(dict.fromkeys(sections))
    if (report.content.get("gtm_strategy") or gtm_constraints is not None) and "gtm_strategy" not in sections:
        sections.append("gtm_strategy")
    db.add(
        ReportEntry(
            report_id=report.id,
            actor_id=user.id,
            kind="version",
            key=uuid.uuid4().hex,
            payload={
                "content": deepcopy(report.content),
                "inputs": deepcopy(report.inputs),
                "sources": deepcopy(report.sources),
                "company_name": report.company_name,
                "model": report.model,
                "saved_at": utcnow().isoformat(),
                "note": correction or "Before refresh",
            },
        )
    )

    # Old citations must stay distinct from the fresh research's S0/S1 identifiers.
    source_ids = {s["id"]: f"OLD-{i + 1}" for i, s in enumerate(report.sources)}

    def rekey(node):
        if isinstance(node, dict):
            return {
                k: [source_ids[sid] for sid in value if sid in source_ids]
                if k == "source_ids"
                else source_ids.get(value, "OLD-MISSING")
                if k == "source_id" and isinstance(value, str)
                else rekey(value)
                for k, value in node.items()
            }
        return [rekey(x) for x in node] if isinstance(node, list) else node

    report.checkpoint = {
        "base_content": rekey(deepcopy(report.content)),
        "base_sources": [dict(s, id=source_ids[s["id"]]) for s in report.sources],
        "sections": sections,
    }
    inputs = dict(report.inputs, founder_corrections=correction)
    if gtm_constraints is not None:
        inputs["gtm_constraints"] = gtm_constraints
    if research_urls is not None:
        inputs["research_urls"] = research_urls
    report.inputs = inputs
    report.status, report.progress = "QUEUED", "Queued for fresh research"
    report.attempts, report.error, report.finished_at, report.lease_until = 0, None, None, None
    report.lease_owner = None
    db.add(
        ReportEntry(
            report_id=report.id,
            actor_id=user.id,
            kind="correction",
            payload={"text": correction, "sections": sections, "origin": "founder"},
        )
    )
    db.commit()
    return report


def compare(db, report, version_id):
    entry = db.scalar(
        select(ReportEntry).where(
            ReportEntry.id == version_id, ReportEntry.report_id == report.id, ReportEntry.kind == "version"
        )
    )
    if entry is None:
        raise NotFound("Report version not found.")
    old, now = entry.payload["content"], report.content or {}
    return {
        "version_id": str(entry.id),
        "saved_at": entry.created_at,
        "changed_sections": [
            {"section": k, "before": old.get(k), "after": now.get(k)}
            for k in sorted(SECTIONS)
            if old.get(k) != now.get(k)
        ],
    }
