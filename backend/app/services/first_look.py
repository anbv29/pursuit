"""Account-limited, four-section free research preview, isolated from paid research."""

import logging
from datetime import timedelta

import httpx
from sqlalchemy import select

from app.core.db import utcnow
from app.core.errors import AppError, Conflict, RateLimited
from app.models import Evidence, Experiment, FirstLook, Source, SuccessCriterion, User
from app.models.enums import DataOrigin, EvidenceKind, Stance, UseCase
from app.services import audit, fetcher, free_research, preview_sources

logger = logging.getLogger("pursuit.first_look")
ASSESSMENT_VERSION = 5
PAGE_UNAVAILABLE = (
    "We couldn't read this page yet. Try another public page from the same website, "
    "such as About or Product, or try again later. Your First Look hasn't been used."
)


def inspect(page, audience, description="", founder_reality=None):
    gathered, sources = preview_sources.collect(page)
    content = free_research.generate(gathered, audience, description, founder_reality)
    return {
        "title": content["snapshot"]["name"],
        "source_url": page.url,
        "source_sha256": page.sha256,
        "retrieved_at": utcnow().isoformat(),
        "excerpt": page.text[:700],
        "assessment_version": ASSESSMENT_VERSION,
        "content": content,
        "founder_reality": founder_reality or {},
        "sources": sources,
        "research_depth": "focused_company_investigation",
        "audience": audience,
        "hypothesis": (
            f"At least 3 of 5 people in {audience or content['segments'][0]['name']} "
            "can describe a recent instance of the problem this product addresses."
        ),
        "limitations": (
            "An AI-generated preview based on up to five public company pages "
            "and your optional description. "
            "Website statements are not independently verified. Customer segments and personas "
            "are hypotheses. No web search, competitor research or market validation was performed."
        ),
    }


def summary(db, workspace_id, user_id):
    row = db.get(FirstLook, user_id)
    outdated = bool(row and row.result and row.result.get("assessment_version", 1) < ASSESSMENT_VERSION)
    return {
        "used": bool(row and row.status == "SUCCEEDED" and not outdated),
        "updated_check_available": outdated,
        "available": free_research.available(),
        "can_retry": bool(
            row
            and row.attempts < 5
            and (
                row.status == "FAILED"
                or (row.status == "RUNNING" and row.updated_at <= utcnow() - timedelta(minutes=3))
            )
        ),
        "status": row.status if row and row.workspace_id == workspace_id else None,
        "preview": row.result if row and row.workspace_id == workspace_id and not outdated else None,
        "error": (
            free_research.UNAVAILABLE if row and row.error == free_research.UNAVAILABLE else PAGE_UNAVAILABLE
        )
        if row and row.workspace_id == workspace_id and row.status == "FAILED" and row.error
        else None,
        "experiment_id": str(row.experiment_id)
        if row and row.workspace_id == workspace_id and row.experiment_id
        else None,
    }


def run(db, workspace, user, body):
    if workspace.is_demo:
        raise AppError(
            "Use a real workspace for your personal first look. Sample reports remain available here."
        )
    if not free_research.available():
        raise AppError(
            "Previews are temporarily unavailable. Please try again later.", "preview_unavailable"
        )
    db.execute(select(User.id).where(User.id == user.id).with_for_update())
    row = db.get(FirstLook, user.id)
    outdated = bool(row and row.result and row.result.get("assessment_version", 1) < ASSESSMENT_VERSION)
    if row and row.status == "SUCCEEDED" and not outdated:
        raise Conflict(
            "Your account's first look has already been used. Your saved result remains available."
        )
    if row and row.status == "RUNNING" and row.updated_at > utcnow() - timedelta(minutes=3):
        raise Conflict("Your first look is running. Refresh its status before trying again.")
    if row and row.attempts >= 5 and not outdated:
        raise RateLimited("The first-look attempt limit was reached. Contact support for help.")
    if row is None:
        row = FirstLook(user_id=user.id, attempts=0)
        db.add(row)
    elif outdated:
        row.attempts = 0
    row.workspace_id, row.company_url, row.audience = workspace.id, str(body.company_url), body.audience
    row.status, row.error, row.result = "RUNNING", None, None
    row.attempts += 1
    attempt = row.attempts
    db.commit()
    try:
        with httpx.Client(timeout=6, follow_redirects=False, trust_env=False) as client:
            page = fetcher.fetch(row.company_url, client=client)
        if len(page.text.strip()) < 40:
            raise fetcher.FetchError(
                "The homepage has too little readable text. Try a public page with more content."
            )
        result, error = (
            inspect(
                page, row.audience, body.description, body.founder_reality.model_dump(exclude_defaults=True)
            ),
            None,
        )
    except free_research.PreviewError:
        result, error = None, free_research.UNAVAILABLE
    except fetcher.FetchError:
        result, error = None, PAGE_UNAVAILABLE
    except Exception:
        logger.error("First look failed for account %s", user.id)
        result, error = None, PAGE_UNAVAILABLE
    db.refresh(row, with_for_update=True)
    if row.workspace_id != workspace.id:
        row.status, row.result, row.error = "FAILED", None, None
        db.commit()
        raise Conflict("The project was removed while the check ran. No result was saved.")
    if row.attempts != attempt:
        raise Conflict("A newer first-look attempt is active. Refresh the latest status.")
    row.result, row.error, row.status = result, error, "SUCCEEDED" if result else "FAILED"
    audit.record(
        db,
        "first_look.completed" if result else "first_look.failed",
        actor_id=user.id,
        workspace_id=workspace.id,
    )
    db.commit()
    return summary(db, workspace.id, user.id)


def to_experiment(db, workspace, user):
    row = db.scalar(select(FirstLook).where(FirstLook.user_id == user.id).with_for_update())
    if not row or row.workspace_id != workspace.id or row.status != "SUCCEEDED":
        raise AppError("Complete a first look in this project before creating its experiment.")
    if row.experiment_id:
        return {"id": str(row.experiment_id)}
    result = row.result
    exp = Experiment(
        workspace_id=workspace.id,
        created_by=user.id,
        use_case=UseCase.PROBLEM_DISCOVERY,
        title=f"Validate the problem: {result['title']}"[:160],
        hypothesis=result["hypothesis"],
        target_audience=row.audience,
        config={"first_look": True},
        is_demo=False,
    )
    exp.criteria = [
        SuccessCriterion(
            metric="problem_confirmed_rate",
            comparator=">=",
            target=0.6,
            min_sample=5,
            description="At least 3 of 5 interviews describe a recent problem instance.",
        )
    ]
    db.add(exp)
    db.flush()
    source = Source(
        workspace_id=workspace.id,
        experiment_id=exp.id,
        url=result["source_url"],
        title=result["title"][:300],
        excerpt=result["excerpt"],
        content_sha256=result["source_sha256"],
        retrieved_at=row.updated_at,
        origin=DataOrigin.IMPORT,
    )
    db.add(source)
    db.flush()
    db.add(
        Evidence(
            experiment_id=exp.id,
            source_id=source.id,
            created_by=user.id,
            kind=EvidenceKind.OBSERVED_FACT,
            stance=Stance.NEUTRAL,
            claim=(f"Website excerpt: {result['excerpt'][:400]}. This is not evidence of customer demand."),
            relevance=0.3,
            origin=DataOrigin.IMPORT,
        )
    )
    row.experiment_id = exp.id
    audit.record(
        db,
        "experiment.create",
        actor_id=user.id,
        workspace_id=workspace.id,
        target_type="experiment",
        target_id=exp.id,
        detail={"first_look": True, "experiment_id": str(exp.id)},
    )
    db.commit()
    return {"id": str(exp.id)}
