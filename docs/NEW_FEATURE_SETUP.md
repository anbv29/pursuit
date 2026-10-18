# Connections, report jobs and usage

Use PostgreSQL locally through Docker; migrations also support a configured Neon PostgreSQL URL.
Apply `alembic upgrade head` from backend before starting the updated application.
Run `PYTHONPATH=. python scripts/migrate_test.py` before the isolated PostgreSQL tests.

## Fo

Set a persistent `CONNECTION_ENCRYPTION_KEY` on the backend. For local setup,
`python scripts/configure_connections.py` creates it in the ignored backend/.env if absent.
Back it up securely: changing it without re-encrypting records prevents reading saved connections.
Do not copy the key into the frontend or commit it. Production must configure its own key.

Set `PUBLIC_APP_URL` to the frontend origin. Connect Fo from workspace Settings.
The OAuth redirect is `PUBLIC_APP_URL/api/fo/oauth/callback`; the frontend proxies it to FastAPI.
Fo must accept that redirect during dynamic client registration. Browser consent is required.
The callback uses the signed-in user's session and validates one-time state and PKCE.
Provider errors request reconnection without exposing tokens. No live Fo action was exercised
by the automated tests; validate consent, refresh and one approved action with your own account.

## Durable reports

Leave `REPORT_WORKER_ENABLED=true` on the backend that should process jobs. PostgreSQL stores
the queue and progress. A lease expires after 90 seconds without a heartbeat. Website and
research checkpoints are reused on retry. Synthesis may repeat after an interruption.
Cancelling prevents result writes; an already-running provider request may still be billed.
Only reports use this durable worker; external actions with uncertain outcomes need review.

## Optional delivery verification

Set backend-only `RESEND_API_KEY` and `RESEND_WORKSPACE_ID` to one explicitly authorized workspace.
The Resend adapter only retrieves sent email status; it does not send messages.
After an approved live Fo email, enter its Resend message ID under delivery verification.
The recipient and subject must match the approved action. Repeated checks do not duplicate
sent or delivered events. No reply or meeting metrics are inferred from opens or clicks.
Emails sent through a different provider cannot be verified through this adapter.

## Estimated AI budgets

Workspace owners choose the monthly application budget and research model in Settings.
Each request reserves a conservative estimated amount under a workspace database lock.
Provider-reported tokens replace the reservation with an estimated cost when available.
Unknown or failed requests keep their reservation because they may have incurred charges.
Reservations reset with the calendar month; this is not an invoice reconciliation system.
Configure provider-side billing limits separately. Older unmetered reports have no fabricated cost.

## Sharing

Report links contain bearer secrets. Only their hashes are persisted, and access logging redacts
the API token path. Links expire in 1–30 days and owners can revoke them immediately.
Snapshots exclude private input fields and question history, but report content can itself
contain sensitive company facts. Review it before sharing. Public pages disable indexing,
referrer transmission and browser caching. Export never includes connection credentials.
