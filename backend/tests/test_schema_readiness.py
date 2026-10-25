from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient

from app import main

pytestmark = pytest.mark.no_database


@pytest.mark.parametrize("fail_at", [None, 1, 2, 3, 4, 5, 6])
def test_health_requires_connection_and_all_customer_workflow_tables(monkeypatch, fail_at):
    calls = []

    class Connection:
        def execute(self, statement):
            calls.append(str(statement))
            if len(calls) == fail_at:
                raise RuntimeError("private database diagnostic")

    class Engine:
        @contextmanager
        def connect(self):
            yield Connection()

    monkeypatch.setattr(main, "get_engine", Engine)
    with TestClient(main.create_app()) as client:
        response = client.get("/api/health")
    assert response.status_code == (200 if fail_at is None else 503)
    body = response.json()
    assert body["schema"] is (fail_at is None)
    assert body["database"] is (fail_at != 1)
    assert "private database diagnostic" not in response.text
    if fail_at is None:
        assert len(calls) == 6
        assert "fo_chat_turns" in calls[1] and "first_looks" in calls[2]
        assert "LIMIT" in calls[1] and "LIMIT" in calls[2]
        assert "interview_captures" in calls[3]
        assert "interview_highlights" in calls[4]
        assert "experiment_reminders" in calls[5]
