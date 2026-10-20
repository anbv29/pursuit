"""Only the selected, authorized generated report is shared after explicit consent."""

import hashlib
import json
import uuid

from sqlalchemy import select

from app.core.errors import AppError, NotFound
from app.models import Report
from app.schemas.fo_chat import FoChatIn
from app.services import fo_chat


def snapshot(db, workspace_id, report_id):
    report = db.scalar(select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id))
    if report is None:
        raise NotFound("Report not found in this project.")
    if report.status != "SUCCEEDED" or not report.content:
        raise AppError("Choose a completed report to share with Fo.")
    data = {
        "report_id": str(report.id),
        "company_name": report.company_name,
        "company_url": report.company_url,
        "generated_at": report.finished_at.isoformat() if report.finished_at else None,
        "content": report.content,
        "sources": [
            {k: source[k] for k in ("url", "title", "retrieved_at") if k in source}
            for source in report.sources
            if isinstance(source, dict)
        ],
    }
    data["fingerprint"] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    if len(json.dumps(data, ensure_ascii=False).encode()) > 100_000:
        raise AppError("This report is too large to share in one Fo request. No report was shared.")
    return data


def share(db, workspace, user, context, request_key, fresh_conversation=False):
    # Recheck access/report existence on callback, before transmitting any data.
    snapshot(db, workspace.id, uuid.UUID(context["report_id"]))
    request_key = "context_" + hashlib.sha256((request_key + context["fingerprint"]).encode()).hexdigest()
    row = fo_chat.prepare(
        db,
        workspace,
        user,
        FoChatIn(
            message=f"Use the report for {context['company_name']} as context for my questions. "
            "Acknowledge it and ask what I want to explore. Do not contact anyone or take external actions.",
            request_key=request_key,
        ),
    )
    if row.status == "PENDING_APPROVAL":
        row.report_context = context
        db.commit()
    return fo_chat.approve(db, workspace, user, row.id, fresh_conversation=fresh_conversation)
