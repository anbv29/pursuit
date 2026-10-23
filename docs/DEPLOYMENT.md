# Deploy the free-only application

See [FREE_MODE.md](FREE_MODE.md) for research coverage, fair-use limits and provider availability.
Local commits do not change the hosted application until the owner authorizes publication.

## Stack

- Frontend: existing Vercel project, root directory `frontend`.
- Backend: existing Render service, root directory `backend`.
- Database: Neon PostgreSQL; use the limited runtime role for the application.
- Local development: Docker PostgreSQL on port 5433.

Use locked requirements and the existing frontend lockfile. Build the frontend with `npm run build`.
Apply Alembic migrations with the authorized migration role before starting the limited runtime user.
No table removal or new database migration is required for the free-only conversion.

## Backend private environment

| Variable | Value / requirement |
| --- | --- |
| APP_ENV | production |
| DATABASE_URL | private Neon runtime-role URL, never exposed to the frontend |
| COOKIE_SECURE | true |
| CORS_ORIGINS | exact frontend HTTPS origin |
| PUBLIC_APP_URL | exact frontend HTTPS origin |
| OPENROUTER_API_KEY | existing research key, server-side only |
| FREE_RESEARCH_MODEL | google/gemma-4-31b-it:free |
| FREE_PREVIEW_ENABLED | true after verifying the hosted provider account |
| REPORT_WORKER_ENABLED | true |
| FO_MODE | preserve the current authorized mode |
| CONNECTION_ENCRYPTION_KEY | preserve the existing stable Fo encryption key |
| TRUSTED_PROXY_HOPS | verify for the actual Vercel/Render proxy chain |
| ACTIONS_DISABLED | preserve emergency shutdown controls |

All model requests enforce zero-priced routing, no paid fallback, no hosted web search,
and the existing no-training data policy. Provider rate limits can prevent research even
when keys are configured. The former MiniMax free endpoint retired on October 22, 2026;
do not deploy with that retired model ID. Run `python -m scripts.verify_ai` in backend
before claiming live inference is working. Never put research secrets in NEXT_PUBLIC variables.

## Frontend

Set the server-only BACKEND_URL to the backend HTTPS origin, retain the same-origin API
proxy and verify production CSP, cookies and HTTPS. Do not add model or payment keys.
Old workspace billing bookmarks redirect to the workspace; checkout routes are removed.

## Existing merchant accounts

Remove retired paid-provider keys from hosting configuration during the authorized rollout.
Application code no longer starts purchases or processes payment events. This does not cancel
an existing merchant subscription or remove an external merchant account. Inspect and cancel
any actual legacy recurring subscriptions with the provider before declaring recurring charges
ended. Historical database rows remain for retention and deletion safeguards.

## Verification

Check `/api/health` for database/schema readiness, sign in, create a workspace and report,
ask a report question, refresh selected sections, verify saved history after reload and test
cross-user rejection. Check real free inference separately from mocked automated tests.
Fo still requires personal Wajo connection, consented report context and approved requests.
Verify its live flow independently; research-provider changes do not establish Fo success.
Free hosting can sleep or impose runtime limits. Do not purchase or upgrade hosting without
explicit owner approval. Monitor worker recovery and provider 429s rather than reporting success
for queued, partial or unknown work.
