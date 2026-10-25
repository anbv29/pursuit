"""Bounded, provider-free suggestions; a human must promote each quoted finding."""

import hashlib
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, NotFound
from app.models import Evidence, Experiment, InterviewCapture, InterviewHighlight, Source, User
from app.models.enums import DataOrigin, EvidenceKind
from app.schemas.founder_workflow import AcceptHighlightIn, CaptureIn, CaptureOut, HighlightIn
from app.services.experiments import log

PATTERNS = [
    (
        "objection",
        r"\b(but|however|too expensive|no budget|not a priority|won't|cannot justify|don't need)\b",
    ),
    ("pain", r"\b(pain|problem|frustrat\w*|struggl\w*|wast\w*|manual\w*|difficult|annoy\w*|hours)\b"),
    ("current_solution", r"\b(currently|today|spreadsheet\w*|excel|workaround|we use|using)\b"),
    ("buying_signal", r"\b(paid|pay|budget|approve\w*|purchas\w*|pilot|deposit)\b"),
]


def suggest(transcript: str) -> list[dict]:
    """Return literal spans, never invented quotes, speaker identities or demand claims."""
    suggestions = []
    for match in re.finditer(r"[^\n.!?]+[.!?]*", transcript):
        raw = match.group()
        quote = raw.strip()
        if len(quote) < 8 or len(quote) > 4000 or quote.endswith("?"):
            continue
        if re.match(r"^(interviewer|question|q)\s*:", quote, re.I):
            continue
        for category, pattern in PATTERNS:
            if re.search(pattern, quote, re.I):
                start = match.start() + len(raw) - len(raw.lstrip())
                suggestions.append(
                    {
                        "category": category,
                        "quote": quote,
                        "start_offset": start,
                        "end_offset": start + len(quote),
                    }
                )
                break
        if len(suggestions) >= 20:
            break
    return suggestions


def get_capture(db: Session, exp: Experiment, capture_id: uuid.UUID) -> InterviewCapture:
    capture = db.scalar(
        select(InterviewCapture).where(
            InterviewCapture.id == capture_id,
            InterviewCapture.experiment_id == exp.id,
        )
    )
    if capture is None:
        raise NotFound("Interview notes not found.")
    return capture


def serialize(db: Session, capture: InterviewCapture) -> CaptureOut:
    highlights = db.scalars(
        select(InterviewHighlight)
        .where(
            InterviewHighlight.capture_id == capture.id,
        )
        .order_by(InterviewHighlight.start_offset, InterviewHighlight.id)
    ).all()
    return CaptureOut(
        id=capture.id,
        title=capture.title,
        transcript=capture.transcript,
        created_at=capture.created_at,
        highlights=highlights,
    )


def create(db: Session, exp: Experiment, user: User, body: CaptureIn) -> CaptureOut:
    if exp.archived_at is not None:
        raise AppError("Restore this experiment before adding interview notes.")
    transcript = body.transcript.replace("\r\n", "\n").replace("\r", "\n")
    capture = InterviewCapture(
        experiment_id=exp.id,
        created_by=user.id,
        title=body.title.strip(),
        transcript=transcript,
    )
    db.add(capture)
    db.flush()
    for item in suggest(transcript):
        db.add(InterviewHighlight(capture_id=capture.id, **item))
    log(db, exp, user, "interview.capture", capture_id=str(capture.id))
    db.commit()
    return serialize(db, capture)


def add_highlight(db: Session, capture: InterviewCapture, body: HighlightIn) -> InterviewHighlight:
    db.execute(select(InterviewCapture.id).where(InterviewCapture.id == capture.id).with_for_update())
    end = body.start_offset + len(body.quote)
    if capture.transcript[body.start_offset : end] != body.quote:
        raise AppError("The quotation must match the saved notes exactly.")
    existing = db.scalar(
        select(InterviewHighlight).where(
            InterviewHighlight.capture_id == capture.id,
            InterviewHighlight.start_offset == body.start_offset,
            InterviewHighlight.end_offset == end,
        )
    )
    if existing:
        return existing
    count = (
        db.scalar(
            select(func.count())
            .select_from(InterviewHighlight)
            .where(
                InterviewHighlight.capture_id == capture.id,
            )
        )
        or 0
    )
    if count >= 100:
        raise AppError("A capture can contain up to 100 highlights. Save another set of notes to continue.")
    highlight = InterviewHighlight(capture_id=capture.id, end_offset=end, **body.model_dump())
    db.add(highlight)
    db.commit()
    return highlight


def accept(
    db: Session,
    exp: Experiment,
    user: User,
    capture: InterviewCapture,
    highlight_id: uuid.UUID,
    body: AcceptHighlightIn,
) -> InterviewHighlight:
    highlight = db.scalar(
        select(InterviewHighlight)
        .where(
            InterviewHighlight.id == highlight_id,
            InterviewHighlight.capture_id == capture.id,
        )
        .with_for_update()
    )
    if highlight is None:
        raise NotFound("Interview highlight not found.")
    if highlight.evidence_id:
        return highlight  # Retries never create duplicate evidence.
    if exp.archived_at is not None:
        raise AppError("Restore this experiment before adding evidence.")
    if capture.transcript[highlight.start_offset : highlight.end_offset] != highlight.quote:
        raise AppError("This quotation no longer matches the saved notes.")
    origin = DataOrigin.DEMO if exp.is_demo else DataOrigin.IMPORT
    line = capture.transcript.count("\n", 0, highlight.start_offset) + 1
    source = Source(
        workspace_id=exp.workspace_id,
        experiment_id=exp.id,
        url=(
            f"/w/{exp.workspace_id}/experiments/{exp.id}"
            f"?tab=interview-notes&capture={capture.id}#capture-{capture.id}"
        ),
        title=f"{capture.title} · line {line}",
        excerpt=highlight.quote,
        content_sha256=hashlib.sha256(capture.transcript.encode()).hexdigest(),
        origin=origin,
    )
    db.add(source)
    db.flush()
    evidence = Evidence(
        experiment_id=exp.id,
        created_by=user.id,
        source_id=source.id,
        kind=EvidenceKind.INTERPRETATION,
        stance=body.stance,
        claim=body.claim,
        relevance=0.5,
        tags=["interview", highlight.category],
        origin=origin,
    )
    db.add(evidence)
    db.flush()
    highlight.evidence_id = evidence.id
    log(db, exp, user, "interview.highlight", capture_id=str(capture.id), evidence_id=str(evidence.id))
    db.commit()
    return highlight
