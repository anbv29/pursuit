import json

from sqlalchemy import select

from app.core.db import utcnow
from app.models import Experiment
from app.models.report_entry import ReportEntry
from app.services import recommendations


def collect(db, report):
    rows = db.scalars(
        select(ReportEntry)
        .where(ReportEntry.report_id == report.id, ReportEntry.kind.in_(["learning", "correction", "task"]))
        .order_by(ReportEntry.created_at.desc(), ReportEntry.id.desc())
    ).all()
    observations, tasks = [], []
    omitted = 0
    for row in rows:
        task = row.kind == "task"
        text = row.payload.get("notes" if task else "text", "").strip()
        if not text and not (task and row.payload.get("done")):
            continue
        target, limit = (tasks, 7) if task else (observations, 5)
        if len(target) >= limit:
            omitted += 1
            continue
        target.append(
            {
                "id": str(row.id),
                "recorded_at": row.payload.get("updated_at") if task else row.created_at.isoformat(),
                "origin": "founder_testimony",
                "text": text[:1000],
                "shortened": len(text) > 1000,
                **({"day": row.payload.get("day"), "done": row.payload.get("done", False)} if task else {}),
            }
        )
    linked = db.scalars(
        select(Experiment)
        .where(
            Experiment.workspace_id == report.workspace_id,
            Experiment.is_demo.is_(False),
            Experiment.config["from_report"].as_string() == str(report.id),
        )
        .order_by(Experiment.updated_at.desc(), Experiment.id.desc())
    ).all()
    experiments = []
    for exp in linked[:3]:
        analysis = recommendations.analysis(db, exp)
        experiments.append(
            {
                "id": str(exp.id),
                "title": exp.title,
                "hypothesis": exp.hypothesis[:1000],
                "stage": exp.stage.value,
                "archived": exp.archived_at is not None,
                "origin": "recorded_experiment_data",
                "criteria": analysis["criteria"],
                "outcome_counts": analysis["metrics"]["outcome_counts"],
                "interviews_completed": analysis["metrics"]["interviews_completed"],
            }
        )
    context = {
        "captured_at": utcnow().isoformat(),
        "observations": observations,
        "tasks": tasks,
        "experiments": experiments,
        "omitted_items": omitted + max(0, len(linked) - 3),
        "caveat": "Founder testimony is unverified. Recorded outcomes are not independent proof of demand. "
        "Criteria include sample limits. Experiment links are associations, not verified provenance.",
    }
    while len(json.dumps(context, ensure_ascii=False).encode()) > 12000:
        largest = max((observations, tasks, experiments), key=lambda items: len(json.dumps(items)))
        largest.pop()
        context["omitted_items"] += 1
    return context
