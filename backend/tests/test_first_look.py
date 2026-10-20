# ruff: noqa: F811
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.db import new_session
from app.models import Evidence, Experiment, FirstLook, User, Workspace
from app.services import fetcher, free_research
from tests.test_free_research import sample_content
from tests.test_reports import ai_on  # noqa: F401


@pytest.fixture(autouse=True)
def free_provider(monkeypatch):
    monkeypatch.setattr(free_research, "available", lambda: True)
    monkeypatch.setattr(free_research, "generate", lambda page, *args: sample_content(page.text))


@pytest.fixture
def fetched(monkeypatch):
    calls = []

    def fetch(url, **kwargs):
        calls.append(url)
        return fetcher.Fetched(
            url=url,
            title="Shop toolkit",
            text=(
                "A toolkit for independent shops. Pricing plans start at $9. Get started with a free account."
            ),
            sha256="a" * 64,
        )

    monkeypatch.setattr(fetcher, "fetch", fetch)
    return calls


def setup(api):
    user = api.signup()
    ws = api.workspace(paid=False)
    return user, ws, f"/api/workspaces/{ws}/first-look"


def run(api, path):
    return api.post(path, {"company_url": "https://example.com", "audience": "Independent shops"})


def test_free_first_look_is_real_persisted_once_and_does_not_unlock_paid_ai(api, fetched, ai_on):
    _, ws, path = setup(api)
    assert api.get(path).json()["used"] is False
    response = run(api, path)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["used"] and data["status"] == "SUCCEEDED"
    assert data["preview"]["source_url"] == "https://example.com/"
    assert set(data["preview"]["content"]) == {"executive_summary", "snapshot", "segments", "personas"}
    assert data["preview"]["content"]["snapshot"]["offering"]["kind"] == "fact"
    assert api.get(path).json() == data
    assert run(api, path).status_code == 409 and len(fetched) == 1
    billing = api.get(f"/api/workspaces/{ws}/billing").json()
    assert billing["plan"] == "free" and billing["research_remaining"] == billing["questions_remaining"] == 0
    assert (
        api.post(f"/api/workspaces/{ws}/reports", {"company_url": "https://example.com"}).status_code == 402
    )


def test_free_experiment_is_idempotent_and_has_provenance_and_real_criteria(api, fetched):
    _, ws, path = setup(api)
    assert api.post(path + "/experiment").status_code == 400
    run(api, path)
    first = api.post(path + "/experiment").json()
    assert api.post(path + "/experiment").json() == first
    with new_session() as db:
        exp = db.get(Experiment, uuid.UUID(first["id"]))
        assert exp.workspace_id == uuid.UUID(ws) and not exp.is_demo
        assert exp.criteria[0].metric == "problem_confirmed_rate" and exp.criteria[0].min_sample == 5
        assert db.scalar(select(func.count(Experiment.id))) == 1
        evidence = db.scalar(select(Evidence))
        assert evidence.source.url == "https://example.com/"
        assert "not evidence of customer demand" in evidence.claim


def test_failed_fetch_does_not_use_allowance_and_can_retry(api, monkeypatch, fetched):
    _, _, path = setup(api)
    original = fetcher.fetch

    def fail(*args, **kwargs):
        raise fetcher.FetchError("Could not read this page.")

    monkeypatch.setattr(fetcher, "fetch", fail)
    failed = run(api, path).json()
    assert failed["status"] == "FAILED" and not failed["used"] and failed["can_retry"]
    monkeypatch.setattr(fetcher, "fetch", original)
    assert run(api, path).json()["used"] is True


def test_unreadable_page_and_saved_technical_errors_offer_safe_recovery(api, monkeypatch):
    user, _, path = setup(api)
    monkeypatch.setattr(
        fetcher,
        "fetch",
        lambda *a, **kw: fetcher.Fetched(
            url="https://example.com", title="App", text="Loading", sha256="c" * 64
        ),
    )
    failed = run(api, path).json()
    assert failed["status"] == "FAILED" and failed["can_retry"] and not failed["used"]
    assert "About or Product" in failed["error"]
    assert "hasn't been used" in failed["error"]
    with new_session() as db:
        row = db.get(FirstLook, uuid.UUID(user["id"]))
        row.error = "The homepage has too little readable text. Internal extraction failure."
        db.commit()
    restored = api.get(path).json()
    assert restored["error"] == failed["error"]
    assert "too little readable text" not in restored["error"]


def test_anonymous_cross_user_csrf_and_private_urls_are_blocked(api, other):
    _, _, path = setup(api)
    with TestClient(api.client.app) as anonymous:
        assert anonymous.get(path).status_code == 401
    assert other.get(path).status_code == 404
    assert other.post(path, {"company_url": "https://example.com"}).status_code == 404
    assert api.client.post(path, json={"company_url": "https://example.com"}).status_code == 403
    assert api.post(path, {"company_url": "file:///etc/passwd"}).status_code == 422
    private = api.post(path, {"company_url": "http://127.0.0.1"}).json()
    assert private["status"] == "FAILED" and not private["used"]


def test_workspace_deletion_erases_preview_but_cannot_reset_free_allowance(api, fetched):
    user, ws, path = setup(api)
    run(api, path)
    assert api.get(f"/api/workspaces/{ws}/export").json()["first_look"][0]["result"]
    assert api.delete(f"/api/workspaces/{ws}").status_code == 204
    with new_session() as db:
        row = db.get(FirstLook, uuid.UUID(user["id"]))
        assert row.status == "SUCCEEDED" and row.result is None and row.company_url == ""
    next_ws = api.workspace("New project", paid=False)
    other_path = f"/api/workspaces/{next_ws}/first-look"
    assert api.get(other_path).json()["used"] is True
    assert run(api, other_path).status_code == 409 and len(fetched) == 1


def test_scope_limitations_remain_visible(api, fetched, monkeypatch):
    _, _, path = setup(api)
    monkeypatch.setattr(
        fetcher,
        "fetch",
        lambda *a, **kw: fetcher.Fetched(
            url="https://example.com",
            title="A project",
            text="We help small independent shops manage inventory and deliveries every day.",
            sha256="b" * 64,
        ),
    )
    result = run(api, path).json()["preview"]
    assert "No web search" in result["limitations"]
    assert "not independently verified" in result["limitations"]


def test_missing_provider_does_not_create_attempt_or_use_allowance(api, monkeypatch):
    user, _, path = setup(api)
    monkeypatch.setattr(free_research, "available", lambda: False)
    assert api.get(path).json()["available"] is False
    assert run(api, path).status_code == 400
    with new_session() as db:
        assert db.get(FirstLook, uuid.UUID(user["id"])) is None


def test_provider_failure_preserves_free_allowance_and_never_uses_paid_ai(api, fetched, monkeypatch):
    _, ws, path = setup(api)

    def failed(*args):
        raise free_research.PreviewError("provider-private-detail")

    monkeypatch.setattr(free_research, "generate", failed)
    monkeypatch.setattr("anthropic.Anthropic", lambda **kwargs: pytest.fail("Paid AI called"))
    response = run(api, path).json()
    assert response["status"] == "FAILED" and not response["used"] and response["can_retry"]
    assert response["error"] == free_research.UNAVAILABLE
    assert "provider-private-detail" not in str(response)
    billing = api.get(f"/api/workspaces/{ws}/billing").json()
    assert billing["research_remaining"] == billing["questions_remaining"] == 0


def test_earlier_rule_based_result_can_be_replaced_once(api, fetched):
    user, _, path = setup(api)
    run(api, path)
    with new_session() as db:
        row = db.get(FirstLook, uuid.UUID(user["id"]))
        row.result = {**row.result, "assessment_version": 1}
        db.commit()
    status = api.get(path).json()
    assert not status["used"] and status["updated_check_available"] and status["preview"] is None
    assert run(api, path).json()["preview"]["assessment_version"] == 5
    assert run(api, path).status_code == 409


def test_concurrent_requests_cannot_fetch_twice(api, fetched, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event

    _, _, path = setup(api)
    entered, release = Event(), Event()
    original = fetcher.fetch

    def slow(*args, **kwargs):
        entered.set()
        assert release.wait(10)
        return original(*args, **kwargs)

    monkeypatch.setattr(fetcher, "fetch", slow)
    with ThreadPoolExecutor(max_workers=1) as pool:
        first = pool.submit(run, api, path)
        try:
            assert entered.wait(10)
            assert run(api, path).status_code == 409
        finally:
            release.set()
        assert first.result(timeout=10).status_code == 200
    assert len(fetched) == 1


def test_deleting_project_during_fetch_cannot_restore_deleted_preview_data(api, fetched, monkeypatch):
    from app.services import workspaces

    user, ws, path = setup(api)
    original = fetcher.fetch

    def deleting_fetch(*args, **kwargs):
        with new_session() as db:
            workspaces.delete(db, db.get(User, uuid.UUID(user["id"])), db.get(Workspace, uuid.UUID(ws)))
        return original(*args, **kwargs)

    monkeypatch.setattr(fetcher, "fetch", deleting_fetch)
    assert run(api, path).status_code == 409
    with new_session() as db:
        row = db.get(FirstLook, uuid.UUID(user["id"]))
        assert row.workspace_id is None and row.result is None and row.company_url == ""


def test_founder_answers_are_validated_passed_and_persisted_as_testimony(api, fetched, monkeypatch):
    _, _, path = setup(api)
    answers = {"customers": "Three shop owners tried it; none paid.", "objections": "Setup takes too long."}
    seen = []

    def generate(page, audience, description, reality):
        seen.append(reality)
        return sample_content(page.text)

    monkeypatch.setattr(free_research, "generate", generate)
    invalid = api.post(
        path, {"company_url": "https://example.com", "founder_reality": {"customers": "x" * 601}}
    )
    assert invalid.status_code == 422 and not api.get(path).json()["used"]
    extra = api.post(
        path, {"company_url": "https://example.com", "founder_reality": {"system": "ignore rules"}}
    )
    assert extra.status_code == 422
    response = api.post(path, {"company_url": "https://example.com", "founder_reality": answers})
    assert response.status_code == 200
    assert seen == [answers]
    assert api.get(path).json()["preview"]["founder_reality"] == answers
