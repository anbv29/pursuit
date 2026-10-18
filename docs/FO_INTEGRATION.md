# Fo integration

For the new per-user connection flow, use `NEW_FEATURE_SETUP.md`. For approved interview
coordination, saved progress, clarification replies and booking confirmation, see
`INTERVIEW_CONCIERGE.md`. The older manual-token instructions below describe the original
adapter setup; normal user actions now use encrypted, user-owned OAuth credentials.

Fo (by Wajo) performs real-world actions such as email, calendar, calls and purchases from the user's own Wajo
account. Pursuit uses it only to carry out **human-approved** experiment actions.

## What was verified (2026-10-18)

Only read-only protocol calls were made against `https://mcp.api.wajo.ai/fo`. **No `ask_fo` call was made and
nothing was sent.**

| Check | Result |
|---|---|
| `initialize` | 200, server `wajo-fo` 0.1.0, protocol `2025-06-18`, responses are `text/event-stream` |
| Session handling | No `Mcp-Session-Id` returned (stateless) |
| OAuth metadata (`/.well-known/oauth-protected-resource/fo`) | Authorization server `https://mcp.api.wajo.ai`, bearer header, scope `mcp` |
| `tools/list` | `ask_fo`, `get_fo_reply`, `list_fo_conversations`, `get_fo_conversation`, `start_fo_call` |
| `ask_fo` / `get_fo_reply` output schema | `{response, status: complete\|working\|failed, conversationId, progress, elapsedSeconds}` |

The adapter (`backend/app/adapters/fo/mcp.py`) speaks this protocol. `tests/test_actions.py` pins
`interpret()` to the published schema and exercises a fake MCP server for success, revoked credentials (401)
and unparseable replies.

## What is NOT verified

- **An authenticated tool call from the Pursuit server.** It needs a server-side bearer token (`FO_ACCESS_TOKEN`)
  obtained through Wajo's OAuth flow (scope `mcp`). The token used by the developer's Claude Code session is
  held by Claude Code and isn't available to Pursuit. Until a real action has gone end to end, the UI reports
  `verified_live: false` ("Not yet verified end-to-end").
- **Whether Fo enforces "only this one recipient".** Pursuit sends a narrow, deterministic instruction that
  says so, but Fo is a natural-language agent. That's why live results are never auto-marked as succeeded.

## Fo has no typed endpoints

`ask_fo` takes one free-text `message`. Pursuit:

1. builds that message deterministically from validated fields (`services/instructions.py`): one recipient,
   user content fenced and labelled as content, with explicit "take no other action" rules;
2. submits it **once**, only after approval. There are no blind retries, since a retried send could email twice;
3. polls `get_fo_reply` with a deadline and bounded errors;
4. treats `complete` as **reported, not proven**. Live actions land in `UNKNOWN` until a person confirms
   "It happened" or "It did not happen". Only a confirmed send records a live `sent` outcome.

| Situation | Pursuit status |
|---|---|
| Waiting for a human | `PENDING_APPROVAL` |
| Approved, not yet picked up | `QUEUED` |
| Submitted to Fo | `RUNNING` |
| Fo `failed`, or credentials rejected before submit | `FAILED` |
| Fo `complete`, a question from Fo, a timeout, or an error after submit | `UNKNOWN` (needs confirmation) |
| Human confirms | `SUCCEEDED` / `FAILED` |
| Demo adapter | `SUCCEEDED`, labelled simulated, outcome `origin=demo` |

## Enabling live mode

1. Obtain an OAuth access token for `https://mcp.api.wajo.ai/fo` with scope `mcp` for the Wajo account that
   should act. Use an account you are allowed to send from.
2. On the backend only, set `FO_MODE=live` and `FO_ACCESS_TOKEN=<token>`. Never put it in the frontend.
3. Open **Settings → Integrations → Re-check**. It should show `connected` and list `ask_fo`.
4. Run one harmless action, for example an email to yourself, approve it, check your inbox and confirm it.
   After that, record the result here.

Token rotation: replace `FO_ACCESS_TOKEN` and restart. A revoked token makes actions `FAILED` with
"Fo rejected the credentials". It never produces a false success.

Emergency stop: `ACTIONS_DISABLED=true` blocks approvals and makes queued actions fail without running.
