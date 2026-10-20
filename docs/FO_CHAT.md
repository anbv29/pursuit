# Personal Wajo chat with report context

Fo Assistant uses each signed-in user's own Wajo OAuth connection. The dedicated
shared service-account experiment has been replaced; no shared credentials or
Anthropic calls are used for chat. Customer Settings remains free of internal
API costs, budget controls and provider diagnostics.

## Connection and context consent

1. Select a completed report in Fo Assistant.
2. Choose Connect Wajo & share report. The confirmation names the report and
   discloses exactly what is sent: generated content and source-link metadata.
3. Sign in/create a Wajo account and approve access in Wajo.
4. The backend validates PKCE/state, stores encrypted user-owned tokens, checks
   current project membership/report access again, then sends the consented
   snapshot to that user's Fo account immediately before returning to chat.

The snapshot is stored in encrypted pending OAuth state until callback. No report
is transmitted to Fo before connection approval. Raw inputs, scraped page bodies,
prospect lists, billing data, API keys and model metadata are excluded. The full
selected generated report is included, not an AI-generated summary. A 100 KB
payload cap rejects oversized reports explicitly; nothing is silently truncated.

A connected user can explicitly share another report through the same consent
control. Every later chat request includes the consented report snapshot. Report
fingerprints keep different report contexts in separate provider conversations;
reconnecting OAuth starts a fresh conversation. Neither this path nor context
preparation consumes research-model tokens or premium report questions.

## Isolation and reliability

Project membership and owner-only action permissions are checked server-side.
History, report lookups and provider references remain scoped to user/project.
Historical shared-service conversation records cannot be used by customers.
The legacy service_user_id column now records the actual user-owned provider
principal; it is not exposed to customers. Tokens refresh using the existing
OAuth flow. No static token or key is requested from customers.

Requests are durable and idempotent before submission. Uncertain results are
not automatically retried; status checks are read-only. Report text is treated as
untrusted reference data, not authority to execute instructions. Explicit human
approval remains required for ordinary Fo requests because Fo can take actions.
Fo replies are not proof of email delivery or booking. Wajo limits still apply;
Pursuit also has a 30-request rolling daily safety limit. Do not claim unlimited.

The consented snapshot persists with chat history until parent deletion; deleting
or disconnecting local data cannot recall information already shared with Wajo.
Workspace export excludes the duplicate report snapshot and provider references.

## Local verification

Migrations through 21c82f1b3a53 applied to local and isolated test PostgreSQL.
Final suite: 22 passed in 58.01s (report sharing, chat, OAuth and concierge).
Browser checks: 3 passed in 16.3s (personal connection, hidden internal settings,
and report-specific consent before navigation). Build/TypeScript and Ruff passed.
An initial test caught missing thread continuation for JSON-null report context;
the query was corrected before the final passing run.

Provider calls in tests are synthetic. A real personal OAuth/report-context
handoff still requires the user's Wajo sign-in and approval. No live report was
submitted during verification. Nothing committed, pushed or deployed.
