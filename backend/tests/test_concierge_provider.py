# ruff: noqa: F811
import httpx
import pytest

from app.adapters.fo.base import FoResult, FoSubmissionUnknown, FoUnavailable
from app.adapters.fo.mcp import McpFoAdapter
from app.core.db import new_session
from app.models import ActionRequest
from app.services import executor
from tests.test_concierge import setup  # noqa: F401


def test_submit_uncertainty_is_never_failed_or_retried(api, setup, monkeypatch):
    path, _, body = setup
    action = api.post(path + "/concierge", body).json()[0]
    calls = []

    class Adapter:
        def submit(self, instruction, key):
            calls.append(key)
            raise FoSubmissionUnknown("Fo may have received this request.")

    monkeypatch.setattr(executor, "get_adapter", lambda *a, **kw: Adapter())
    api.post(path + f"/actions/{action['id']}/decision", {"decision": "approve"})
    result = next(a for a in api.get(path + "/actions").json() if a["id"] == action["id"])
    assert result["status"] == "UNKNOWN" and len(calls) == 1


def test_provider_reference_and_progress_are_saved_before_poll(api, setup, monkeypatch):
    path, _, body = setup
    action = api.post(path + "/concierge", body).json()[0]

    class Adapter:
        def submit(self, instruction, key):
            return FoResult(state="working", summary="Checking availability", conversation_ref="saved-ref")

        def poll(self, ref):
            assert ref == "saved-ref"
            with new_session() as db:
                row = db.get(ActionRequest, action["id"])
                assert row.provider_ref == ref and row.fo_state == "working"
            return FoResult(state="needs_input", summary="Which day?", conversation_ref=ref)

    monkeypatch.setattr(executor, "get_adapter", lambda *a, **kw: Adapter())
    api.post(path + f"/actions/{action['id']}/decision", {"decision": "approve"})


def test_live_reply_schema_binds_conversation_and_rejects_missing_ref(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("FO_ACCESS_TOKEN", "test-only")
    get_settings.cache_clear()
    try:
        adapter = McpFoAdapter(client=httpx.Client())
        adapter._session = "test-session"
        captured = []

        def rpc(method, params):
            captured.append(params)
            return {
                "structuredContent": {
                    "status": "complete",
                    "response": "Proposed a time",
                    "conversationId": "owned",
                }
            }

        monkeypatch.setattr(adapter, "_rpc", rpc)
        assert adapter.reply("Approved clarification", "owned").conversation_ref == "owned"
        assert captured[0]["arguments"] == {"message": "Approved clarification", "conversationId": "owned"}
        with pytest.raises(FoUnavailable):
            adapter.poll(None)
    finally:
        get_settings.cache_clear()
