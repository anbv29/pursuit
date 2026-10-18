"""Live adapter: minimal MCP (streamable HTTP) client for Fo's `ask_fo` / `get_fo_reply`.

Verified against https://mcp.api.wajo.ai/fo on 2026-10-18 with read-only calls
(initialize, tools/list): SSE responses, no session id, tool output schema
{response, status: complete|working|failed, conversationId, progress, elapsedSeconds}.
NOT verified: an authenticated tool call from this server (needs FO_ACCESS_TOKEN from
Wajo's OAuth, scope "mcp"). Fo's free-text completion is never treated as proof of
success; upstream maps it to UNKNOWN until a human confirms.
"""

import itertools
import json

import httpx

from app.adapters.fo.base import FoResult, FoSubmissionUnknown, FoUnavailable
from app.core.config import get_settings

PROTOCOL_VERSION = "2025-06-18"


class McpFoAdapter:
    mode = "live"

    def __init__(self, client: httpx.Client | None = None, user_id=None) -> None:
        s = get_settings()
        self._user_id = user_id
        if user_id is not None:
            from app.core.errors import AppError
            from app.services.fo_oauth import access_token

            try:
                token = access_token(user_id)
            except AppError as exc:
                raise FoUnavailable(exc.message) from exc
        elif s.fo_access_token and s.fo_access_token.get_secret_value():
            token = s.fo_access_token.get_secret_value()
        else:
            raise FoUnavailable("Fo live mode needs FO_ACCESS_TOKEN on the server.")
        self._url = s.fo_mcp_url
        self._token = token
        self._client = client or httpx.Client(timeout=s.fo_timeout_seconds)
        self._ids = itertools.count(1)
        self._session: str | None = None

    # --- JSON-RPC plumbing -------------------------------------------------
    def _headers(self) -> dict[str, str]:
        h = {
            "Authorization": f"Bearer {self._token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": PROTOCOL_VERSION,
        }
        if self._session:
            h["Mcp-Session-Id"] = self._session
        return h

    def _rpc(self, method: str, params: dict | None = None, notify: bool = False, retry_auth=True) -> dict:
        msg: dict = {"jsonrpc": "2.0", "method": method, "params": params or {}}
        if not notify:
            msg["id"] = next(self._ids)
        try:
            r = self._client.post(self._url, headers=self._headers(), json=msg)
        except httpx.HTTPError as exc:
            if method == "tools/call" and (params or {}).get("name") == "ask_fo":
                raise FoSubmissionUnknown(
                    "Fo may have received the request; check its outcome before retrying."
                ) from exc
            raise FoUnavailable("Fo is unreachable (network error or timeout).") from exc
        if r.status_code in (401, 403):
            if r.status_code == 401 and self._user_id is not None and retry_auth:
                from app.core.errors import AppError
                from app.services.fo_oauth import access_token

                try:
                    self._token = access_token(self._user_id, force=True)
                except AppError as exc:
                    raise FoUnavailable(exc.message) from exc
                return self._rpc(method, params, notify, retry_auth=False)
            raise FoUnavailable("Fo rejected the credentials (revoked or insufficient scope).")
        if r.status_code == 429:
            raise FoUnavailable("Fo rate limit reached. Try again later.")
        if r.status_code >= 500:
            if method == "tools/call" and (params or {}).get("name") == "ask_fo":
                raise FoSubmissionUnknown("Fo returned a server error after submission; outcome unknown.")
            raise FoUnavailable(f"Fo is having problems (HTTP {r.status_code}).")
        if r.status_code >= 400:
            raise FoUnavailable(f"Fo refused the request (HTTP {r.status_code}).")
        self._session = r.headers.get("mcp-session-id", self._session)
        if notify:
            return {}
        try:
            payload = self._parse_body(r, msg["id"])
        except FoUnavailable as exc:
            if method == "tools/call" and (params or {}).get("name") == "ask_fo":
                raise FoSubmissionUnknown(
                    "Fo received a request but its response could not be read."
                ) from exc
            raise
        if "error" in payload:
            raise FoUnavailable(f"Fo returned an error: {str(payload['error'].get('message', ''))[:200]}")
        return payload.get("result", {})

    @staticmethod
    def _parse_body(r: httpx.Response, req_id: int) -> dict:
        if r.headers.get("content-type", "").startswith("text/event-stream"):
            for line in r.text.splitlines():
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue
                    if data.get("id") == req_id:
                        return data
            raise FoUnavailable("Fo sent a response we couldn't read.")
        try:
            return r.json()
        except ValueError as exc:
            raise FoUnavailable("Fo sent a response we couldn't read.") from exc

    def _ensure_session(self) -> None:
        if self._session:
            return
        self._rpc(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "pursuit", "version": "0.1.0"},
            },
        )
        self._rpc("notifications/initialized", notify=True)

    # --- tool result interpretation --------------------------------------------
    @staticmethod
    def interpret(result: dict) -> FoResult:
        """Map a tools/call result to FoResult. Unrecognised shapes stay non-final."""
        text = " ".join(c.get("text", "") for c in result.get("content", []) if c.get("type") == "text")
        data = result.get("structuredContent")
        if not isinstance(data, dict):
            try:
                data = json.loads(text)
            except (json.JSONDecodeError, TypeError):
                data = {}
        status = str(data.get("status", "")).lower()
        # Verified output schema (tools/list, 2026-10-18); see module docstring.
        summary = str(data.get("response") or data.get("progress") or text)[:2000]
        ref = data.get("conversationId")
        if not isinstance(ref, str) or not 0 < len(ref) <= 200:
            ref = None
        if result.get("isError") or status == "failed":
            return FoResult(state="failed", summary=summary or "Fo reported a failure.", conversation_ref=ref)
        if status == "complete":
            return FoResult(state="complete", summary=summary, conversation_ref=ref)
        if status == "working":
            return FoResult(state="working", summary=summary, conversation_ref=ref)
        # Fo asked a question, or we don't recognise the shape: needs a human.
        return FoResult(
            state="needs_input", summary=summary or "Fo's reply was unclear.", conversation_ref=ref
        )

    # --- adapter API ------------------------------------------------------------
    def submit(self, instruction: str, idempotency_key: str) -> FoResult:
        self._ensure_session()
        result = self._rpc(
            "tools/call",
            {"name": "ask_fo", "arguments": {"message": instruction, "newConversation": True}},
        )
        return self.interpret(result)

    def poll(self, conversation_ref: str | None) -> FoResult:
        if not conversation_ref:
            raise FoUnavailable("No task conversation ID was returned. Review Fo before trying again.")
        self._ensure_session()
        args: dict = {"waitSeconds": 40}
        if conversation_ref:
            args["conversationId"] = conversation_ref
        return self.interpret(self._rpc("tools/call", {"name": "get_fo_reply", "arguments": args}))

    def reply(self, instruction: str, conversation_ref: str) -> FoResult:
        if not conversation_ref:
            raise FoUnavailable("This task has no linked Fo conversation.")
        self._ensure_session()
        return self.interpret(
            self._rpc(
                "tools/call",
                {
                    "name": "ask_fo",
                    "arguments": {"message": instruction, "conversationId": conversation_ref},
                },
            )
        )

    def health(self) -> dict:
        try:
            self._ensure_session()
            tools = self._rpc("tools/list").get("tools", [])
        except FoUnavailable as exc:
            return {"mode": "live", "status": "error", "detail": str(exc)}
        names = sorted(t.get("name", "") for t in tools)
        ok = "ask_fo" in names
        return {"mode": "live", "status": "connected" if ok else "error", "tools": names}
