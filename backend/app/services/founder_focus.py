"""Explainable priorities from saved work; no model predictions or external actions."""

import uuid
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.db import utcnow
from app.core.errors import AppError, NotFound
from app.models import (
    ActionRequest,
    AuditEvent,
    Evidence,
    Experiment,
    ExperimentReminder,
    Membership,
    OutcomeEvent,
    Recommendation,
    Report,
    SuccessCriterion,
    User,
)
from app.models.enums import ActionStatus, DataOrigin, Role, Stage
from app.schemas.founder_workflow import FocusOut, PriorityOut, ReminderIn, ReminderOut, ReminderPatch
from app.services import experiments


def reminder_out(reminder: ExperimentReminder, exp: Experiment, now=None) -> ReminderOut:
    return ReminderOut(
        id=reminder.id,
        experiment_id=exp.id,
        experiment_title=exp.title,
        is_demo=exp.is_demo,
        title=reminder.title,
        due_at=reminder.due_at,
        completed_at=reminder.completed_at,
        overdue=reminder.completed_at is None and reminder.due_at < (now or utcnow()),
    )


def list_reminders(db: Session, workspace_id: uuid.UUID, experiment_id=None, include_completed=False):
    query = (
        select(ExperimentReminder, Experiment)
        .join(
            Experiment,
            ExperimentReminder.experiment_id == Experiment.id,
        )
        .where(Experiment.workspace_id == workspace_id, Experiment.archived_at.is_(None))
    )
    if experiment_id is not None:
        query = query.where(Experiment.id == experiment_id)
    if not include_completed:
        query = query.where(ExperimentReminder.completed_at.is_(None))
    now = utcnow()
    return [
        reminder_out(r, e, now)
        for r, e in db.execute(
            query.order_by(
                ExperimentReminder.completed_at.is_not(None),
                ExperimentReminder.due_at,
                ExperimentReminder.id,
            ).limit(200)
        )
    ]


def create_reminder(db: Session, workspace_id: uuid.UUID, user: User, body: ReminderIn):
    exp = experiments.get(db, workspace_id, body.experiment_id)
    if exp.archived_at is not None:
        raise AppError("Restore this experiment before setting a reminder.")
    reminder = ExperimentReminder(created_by=user.id, **body.model_dump())
    db.add(reminder)
    experiments.log(db, exp, user, "reminder.create")
    db.commit()
    return reminder_out(reminder, exp)


def update_reminder(db: Session, workspace_id: uuid.UUID, reminder_id, user: User, body: ReminderPatch):
    row = db.execute(
        select(ExperimentReminder, Experiment)
        .join(
            Experiment,
            ExperimentReminder.experiment_id == Experiment.id,
        )
        .where(Experiment.workspace_id == workspace_id, ExperimentReminder.id == reminder_id)
        .with_for_update()
    ).first()
    if row is None:
        raise NotFound("Reminder not found.")
    reminder, exp = row
    if body.due_at is not None:
        reminder.due_at = body.due_at
    if body.completed is not None:
        reminder.completed_at = (reminder.completed_at or utcnow()) if body.completed else None
    experiments.log(db, exp, user, "reminder.update", completed=reminder.completed_at is not None)
    db.commit()
    return reminder_out(reminder, exp)


def focus(db: Session, member: Membership) -> FocusOut:
    now = utcnow()
    ws_id = member.workspace_id
    base = f"/w/{ws_id}"
    exps = db.scalars(
        select(Experiment)
        .where(
            Experiment.workspace_id == ws_id,
            Experiment.archived_at.is_(None),
        )
        .order_by(Experiment.updated_at, Experiment.id)
    ).all()
    by_id = {e.id: e for e in exps}
    reminders = list_reminders(db, ws_id)
    overdue_count = (
        db.scalar(
            select(func.count())
            .select_from(ExperimentReminder)
            .join(
                Experiment,
                ExperimentReminder.experiment_id == Experiment.id,
            )
            .where(
                Experiment.workspace_id == ws_id,
                Experiment.archived_at.is_(None),
                ExperimentReminder.completed_at.is_(None),
                ExperimentReminder.due_at < now,
            )
        )
        or 0
    )
    priorities = []
    covered = set()

    def add(key, title, reason, href, demo=False, urgency="next_step"):
        priorities.append(
            PriorityOut(
                id=key,
                title=title,
                reason=reason,
                href=href,
                is_demo=demo,
                urgency=urgency,
            )
        )

    for reminder in reminders:
        if reminder.overdue and len(priorities) < 2:
            add(
                f"reminder:{reminder.id}",
                reminder.title,
                f"Overdue in {reminder.experiment_title}. Complete it or choose a new date.",
                f"{base}/focus#reminder-{reminder.id}",
                reminder.is_demo,
                "overdue",
            )
            covered.add(reminder.experiment_id)

    pending = (
        db.scalars(
            select(ActionRequest)
            .where(
                ActionRequest.workspace_id == ws_id,
                ActionRequest.experiment_id.in_(by_id),
                ActionRequest.status.in_([ActionStatus.PENDING_APPROVAL, ActionStatus.UNKNOWN]),
            )
            .order_by(ActionRequest.created_at, ActionRequest.id)
        ).all()
        if by_id
        else []
    )
    visible_pending = [a for a in pending if member.role == Role.OWNER or not a.payload.get("coordination")]
    if visible_pending:
        add(
            "approvals",
            "Review actions waiting on you",
            f"{len(visible_pending)} saved action(s) need review or an outcome check. Nothing is sent here.",
            f"{base}/approvals",
            member.workspace.is_demo,
            "needs_review",
        )
        covered.update(a.experiment_id for a in visible_pending)

    def counts(model):
        query = select(model.experiment_id, func.count()).where(model.experiment_id.in_(by_id))
        if model is Evidence:
            query = query.join(Experiment, Evidence.experiment_id == Experiment.id).where(
                or_(Experiment.is_demo.is_(True), Evidence.origin != DataOrigin.DEMO),
            )
        return dict(db.execute(query.group_by(model.experiment_id)).all()) if by_id else {}

    evidence_counts, criteria_counts = counts(Evidence), counts(SuccessCriterion)
    activity = (
        dict(
            db.execute(
                select(AuditEvent.target_id, func.max(AuditEvent.created_at))
                .where(
                    AuditEvent.workspace_id == ws_id,
                    AuditEvent.target_type == "experiment",
                    AuditEvent.target_id.in_([str(eid) for eid in by_id]),
                )
                .group_by(AuditEvent.target_id)
            ).all()
        )
        if by_id
        else {}
    )

    def last_activity(exp):
        return max(exp.updated_at, activity.get(str(exp.id), exp.updated_at))

    latest_outcomes = (
        dict(
            db.execute(
                select(OutcomeEvent.experiment_id, func.max(OutcomeEvent.occurred_at))
                .join(Experiment, OutcomeEvent.experiment_id == Experiment.id)
                .where(OutcomeEvent.experiment_id.in_(by_id))
                .where(or_(Experiment.is_demo.is_(True), OutcomeEvent.origin != DataOrigin.DEMO))
                .group_by(OutcomeEvent.experiment_id)
            ).all()
        )
        if by_id
        else {}
    )
    recs = (
        db.scalars(
            select(Recommendation)
            .where(Recommendation.experiment_id.in_(by_id))
            .order_by(Recommendation.created_at.desc(), Recommendation.id)
        ).all()
        if by_id
        else []
    )
    latest_recs = {}
    for rec in recs:
        latest_recs.setdefault(rec.experiment_id, rec)

    candidates = []
    for exp in exps:
        if exp.id in covered:
            continue
        href = f"{base}/experiments/{exp.id}"
        rec, outcome = latest_recs.get(exp.id), latest_outcomes.get(exp.id)
        if rec and rec.includes_demo_data and not exp.is_demo:
            rec = None
        if not criteria_counts.get(exp.id):
            candidates.append(
                (
                    0,
                    exp,
                    "Define what success looks like",
                    f"{exp.title} has no success criteria. Set a threshold before judging the result.",
                    href,
                )
            )
        elif outcome and (not rec or rec.created_at < outcome):
            candidates.append(
                (
                    1,
                    exp,
                    "Review newly recorded results",
                    f"{exp.title} has outcomes newer than its last recommendation.",
                    href,
                )
            )
        elif not evidence_counts.get(exp.id) and exp.stage in (
            Stage.HYPOTHESIS,
            Stage.RESEARCH,
            Stage.EVIDENCE,
        ):
            candidates.append(
                (
                    2,
                    exp,
                    "Add evidence before deciding",
                    f"{exp.title} has no recorded evidence. "
                    "Capture interview notes or add a research source.",
                    href + "?tab=interview-notes",
                )
            )
        elif rec and rec.next_action:
            candidates.append(
                (
                    3,
                    exp,
                    "Follow up on the saved recommendation",
                    f"{exp.title}: {rec.next_action[:300]}",
                    href,
                )
            )
        elif last_activity(exp) < now - timedelta(days=7):
            candidates.append(
                (
                    4,
                    exp,
                    "Check in on an inactive experiment",
                    f"{exp.title} has not been updated in seven days. Record progress or archive it.",
                    href,
                )
            )
    for _, exp, title, reason, href in sorted(
        candidates, key=lambda item: (item[0], last_activity(item[1]), str(item[1].id))
    ):
        if len(priorities) >= 5:
            break
        add(f"experiment:{exp.id}", title, reason, href, exp.is_demo)
    if not priorities:
        report = db.scalar(
            select(Report).where(Report.workspace_id == ws_id).order_by(Report.created_at.desc()).limit(1)
        )
        if report and report.status == "SUCCEEDED":
            add(
                "report",
                "Choose a test from your latest report",
                "Turn one recommendation into an experiment with a measurable result.",
                f"{base}/reports/{report.id}",
                member.workspace.is_demo,
            )
        elif not exps:
            add(
                "start",
                "Start with one business question",
                "Analyze your company or create a manual experiment "
                "to give your next decision some evidence.",
                f"{base}/reports/new",
                member.workspace.is_demo,
            )
    return FocusOut(priorities=priorities, reminders=reminders, overdue_count=overdue_count, generated_at=now)
