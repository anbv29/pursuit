# Interview concierge

The concierge helps arrange customer-discovery interviews through Fo. It does not conduct
interviews, transcribe calls, collect personal contacts, or infer attendance and buying intent.

## Founder workflow

1. Open an experiment's **Prospects & interviews** tab. Available for problem discovery,
   segment validation and willingness-to-pay experiments; workspace owners only.
2. Add prospects with email addresses and provenance where available. Select one to five.
   Prospects marked declined cannot be selected.
3. Enter the invitation, interview length, available times, scheduling timezone and a
   deadline within 14 days. Reminders are off by default; optionally allow at most one,
   only after 48 hours without a reply and before the deadline.
4. Review the invitation preview. Request approvals: this saves one independent task per
   recipient and sends nothing.
5. Open **Actions**, review each complete scope, then approve. Only approved tasks execute.
6. Inspect saved coordination history. Unclear or interrupted tasks appear in
   **Approvals → Fo needs attention**. Use **Check Fo update** to poll that task only.
7. If Fo needs clarification, write an answer, review it, and explicitly approve the reply.
   Recipient/window/deadline/reminder boundaries remain unchanged. Broader work needs a new task.
8. Check the actual calendar or reply before recording a booking, decline or no response.
   A booked result requires a timestamp and creates one planned interview and one booking event.
   Record attendance and interview findings separately after the conversation.

## Provider contract and boundaries

Read-only `initialize` and `tools/list` were rechecked against Fo. Its published `ask_fo` schema
supports `message`, `conversationId`, and `newConversation`; `conversationId` cannot be combined
with `newConversation`. Replies use the saved action conversation ID. `get_fo_reply` supports
`conversationId` and bounded `waitSeconds`. No live action was sent during implementation.

Coordination delegates natural-language instructions to Fo, not a typed scheduling API.
Recipient, reminder and deadline limits are included in every request; their real-world
enforcement by Fo still needs live verification. Pursuit validates inputs, authorizes the actor,
checks the owner/prospect/deadline again before execution, and persists progress and approvals.
It cannot independently guarantee that an external agent follows every instruction.

Only the account that started a task can poll or reply through its Fo connection. Conversation
history is scoped to local experiment actions; unrelated Fo account conversations are not imported.
Non-owner workspace members cannot view concierge contacts/history or approve, reject or cancel
these tasks. Owner exports include action updates and exclude credentials.

## Honest states and recovery

- Pending approvals are not executed. Each recipient needs separate approval.
- A working task saves its conversation ID before polling; progress survives page refresh.
- Live completion remains unconfirmed. A free-text reply never creates a booking automatically.
- An uncertain submission is not retried blindly; sending again could duplicate outreach.
- Replies are submitted once after approval. Timeouts remain unknown and require checking.
- Booking records are serialized and duplicate result submissions are rejected.
- Demo bookings/interviews are labelled simulated and excluded from live performance metrics.
- Cancelling a pending/queued local task does not cancel work already accepted by Fo. No verified
  remote cancellation tool is available here. Recording a result also does not stop a remote task.
- The external action executor is still process-local. An interrupted running action may need
  manual Fo review; the durable report queue does not make external actions durable.

## Configuration and live verification

Apply migrations (`alembic upgrade head`). Use `FO_MODE=demo` to exercise the complete simulated
flow without sending anything. For real coordination, configure persistent connection encryption,
set `FO_MODE=live`, and connect your own Fo account from Settings (see `NEW_FEATURE_SETUP.md`).
Before offering paid live coordination, approve one invitation to a consenting test recipient,
check the actual email/calendar, verify clarification and token-refresh behavior, and confirm
that the provider respects recipient, reminder, calendar and deadline limits. Provider costs
and account limits must be checked separately. None of those live outcomes is claimed here.

## Executed verification (2026-10-18)

- Applied migration `400dfbe519c4` to local development and isolated test PostgreSQL databases.
- `pytest -q -rA`: **108 passed**. Includes real API/database tests for atomic invitation batches,
  limits, expired execution, owner-only access, duplicate prevention, scoped conversation replies,
  saved progress, unknown submission outcomes and live/demo result separation. Provider calls mocked.
- `ruff check backend/app backend/tests`: passed; formatting checks for the new backend modules passed.
- `npm run lint`, `npx tsc --noEmit`: passed.
- `NEXT_DIST_DIR=.next-build NODE_OPTIONS=--max-old-space-size=1536 npm run build`: passed.
- `npx playwright test e2e/concierge.spec.ts e2e/reading-mode.spec.ts --project=desktop`:
  **5 passed**, including actual browser → API → PostgreSQL concierge flows at 1280px and 390px.
  A booking persisted after reload; exactly one planned demo interview and one demo booking event
  were verified. Report-reading tests use synthetic API fixtures.
- `npx playwright test e2e/experiment-flow.spec.ts e2e/responsive.spec.ts`: **5 passed**,
  covering the existing experiment/approval loop, cross-user rejection, signup validation,
  anonymous protection and desktop/mobile demo screens. Total browser checks: **10 passed**.
- Desktop and mobile screenshots were inspected against the existing product components and tokens.
  No horizontal overflow or browser page errors occurred in the concierge tests.
- Published Fo tool inputs were rechecked through read-only MCP calls. No live `ask_fo` action,
  message, reminder, calendar booking or call was performed.

Earlier security/readiness findings remain open. This feature's demo and mocked-provider checks
do not certify Fo's real execution or resolve production monitoring, backup or account-management gaps.
