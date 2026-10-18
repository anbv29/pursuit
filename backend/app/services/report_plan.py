"""A persisted first-week plan derived from the saved report, with no extra AI call."""

from sqlalchemy import select

from app.core.errors import AppError, NotFound
from app.models import Report
from app.models.report_entry import ReportEntry

INTERVIEW_SCRIPT = [
    "Tell me about the last time this problem happened.",
    "How did you deal with it, and who else was involved?",
    "How often does it happen, and what does it cost in time or money?",
    "What have you already tried or paid for?",
    "Who approves spending, and what would justify trying a different solution?",
]


def list_tasks(db, report):
    return db.scalars(
        select(ReportEntry)
        .where(ReportEntry.report_id == report.id, ReportEntry.kind == "task")
        .order_by(ReportEntry.key)
    ).all()


def create(db, report, user):
    db.execute(select(Report.id).where(Report.id == report.id).with_for_update())
    existing = list_tasks(db, report)
    if existing:
        return existing
    if report.status != "SUCCEEDED" or not report.content:
        raise AppError("Finish a report before creating its first-week plan.")
    content = report.content
    segment = (content.get("segments") or [{"name": "your most promising customer group"}])[0]["name"]
    focus = content.get("focus_first", "Choose one important assumption to test.")
    ideas = content.get("experiments", [])
    first = ideas[0]["title"] if ideas else "Test the problem with customers"
    days = [
        (
            "Choose who and what to test",
            f"Start with {segment}.",
            [focus, "Write one belief that a real observation could prove wrong."],
            "Save one audience and one testable belief.",
        ),
        (
            "Find five people to learn from",
            "Look for a small, relevant group; do not send bulk messages.",
            ["Use the report's suggested channels.", "Save where you found each person or company."],
            "Save five relevant prospects with sources.",
        ),
        (
            "Prepare your conversations",
            "Ask about behavior, not hypothetical enthusiasm.",
            INTERVIEW_SCRIPT,
            "Prepare five questions and schedule conversations with permission.",
        ),
        (
            "Listen and record what happened",
            "Keep contradictions as carefully as supporting evidence.",
            [
                "Use the interview questions from day 3.",
                "Record current solutions, costs, frequency and exact objections.",
            ],
            "Record interview notes and at least one contradiction or unresolved question.",
        ),
        (
            "Run one small test",
            first,
            [
                "Use the recommended experiment's success measure.",
                "Review recipients and approve any external action explicitly.",
            ],
            "Create the experiment and record its actual outcomes.",
        ),
        (
            "Check the evidence",
            "Compare results with the goal you set before the test.",
            ["Check sample size and missing data.", "Separate polite interest from real commitments."],
            "Record what the data supports, challenges, and cannot yet answer.",
        ),
        (
            "Decide the next step",
            "Keep going, change the test, change direction, or collect more evidence.",
            [
                "Generate a recommendation from the experiment.",
                "Choose one next action with an owner and a date.",
            ],
            "Save one decision, its evidence, and the next action.",
        ),
    ]
    for day, (title, goal, steps, criterion) in enumerate(days, 1):
        db.add(
            ReportEntry(
                report_id=report.id,
                actor_id=user.id,
                kind="task",
                key=f"day-{day}",
                payload={
                    "day": day,
                    "title": title,
                    "goal": goal,
                    "steps": steps,
                    "completion": criterion,
                    "done": False,
                    "notes": "",
                },
            )
        )
    db.commit()
    return list_tasks(db, report)


def update_task(db, report, user, task_id, done, notes):
    row = db.scalar(
        select(ReportEntry)
        .where(ReportEntry.id == task_id, ReportEntry.report_id == report.id, ReportEntry.kind == "task")
        .with_for_update()
    )
    if row is None:
        raise NotFound("Plan task not found.")
    row.payload = dict(row.payload, done=done, notes=notes, updated_by=str(user.id))
    db.commit()
    return row
