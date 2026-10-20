# Deployment: Neon + Render + Vercel

**Status: free preview deployed at https://pursuit-coral.vercel.app.** Public proxy health, owner login,
Team allowances, 20 browser checks and a separate real AI report passed. On 2026-10-19 the owner
subsequently requested live checkout activation; it is now enabled and a no-charge checkout was verified.

## Current deployment preparation (2026-10-18)

- User authorized pushing verified commits to `anbv29/pursuit` for deployment and chose **free preview with payments disabled**. No paid hosting plan or upgrade is authorized.
- Vercel Hobby, Render and Neon account access is available. Created separate free Neon `Pursuit Preview` project (`muddy-grass-91348778`) in Singapore, migrated its schema, and tested its limited runtime login. Hosting forms are being prepared.
- Commercial launch would require a suitable paid hosting plan; this preview is not a commercial payment launch. Do not buy or upgrade without separate spending approval.
- Backend CI lint/format failures in generated migrations were corrected without changing operations. Test configuration explicitly excludes private live Dodo credentials and forces test mode.
- `scripts/check_test_migrations.py` checks upgrade/downgrade/upgrade only on local `pursuit_test`; it refuses hosted URLs. This is never a production rollback command.
- Update 2026-10-19: the owner approved saving live Dodo API/signing keys and the Anthropic key privately in Render. These settings were saved with Haiku defaults and the report worker enabled. `BILLING_CHECKOUT_ENABLED=false` independently prevents purchases. Fo remains labelled demo mode. See `PAYMENT_LAUNCH_SETUP.md` for executed checks and remaining verification.
- On free Render compute, apply migrations separately using the locally held Neon owner connection before deploying. Only the limited runtime connection belongs in Render. There is no free pre-deploy migration hook. `scripts/provision_preview.py` handles the initial migration and role setup from ignored `.env.preview`.
- A new Neon owner password appeared in a setup screenshot; that file was deleted and the user reset the credential before use. Never capture screenshots of visible credential dialogs. No connection strings or encryption keys belong in Git.

Pricing/policy sources: [Vercel pricing](https://vercel.com/pricing), [Vercel Hobby scope](https://vercel.com/docs/plans/hobby), [Render Starter compute](https://render.com/articles/render-vs-railway). Confirm the final dashboard quote before any purchase.

```
Browser ──► Vercel (Next.js) ──/api/* rewrite──► Render (FastAPI) ──► Neon (Postgres)
                                                       └──► Fo MCP (live mode), Anthropic API (optional)
```

Because Vercel proxies `/api/*`, the browser talks to a single origin. Cookies stay first-party
(`SameSite=Lax`), and CORS is only needed for direct API access.

## 1. Database (Neon)

1. Create a project and a database named `pursuit`. Copy the **pooled** connection string
   (`postgresql://...?sslmode=require`). Pursuit converts it to the psycopg driver automatically.
2. For least privilege, create an app role that owns only the `pursuit` schema objects. Run migrations with
   that role or with the owner. Don't use the Neon admin role at runtime.
3. Turn on Neon's point-in-time restore. Restoration hasn't been tested, see the security checklist (#44).

## 2. Backend (Render)

Use the blueprint `render.yaml` (New → Blueprint), or create a Python web service with:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build | `pip install -r requirements.txt` |
| Migrations | apply separately with the owner role before deploying the free preview |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/api/health` (returns 503 if the database is unreachable) |

Environment variables (set the secrets in the dashboard):

| Variable | Value |
|---|---|
| `APP_ENV` | `production` (enforces secure cookies, no wildcard CORS, hides `/docs`) |
| `DATABASE_URL` | Neon connection string |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://pursuit.vercel.app` |
| `PUBLIC_APP_URL` | exact frontend HTTPS origin for OAuth and checkout returns |
| `CONNECTION_ENCRYPTION_KEY` | stable privately provisioned Fernet key; preserve across redeploys |
| `ANTHROPIC_API_KEY` | approved private server-side key; never a frontend variable |
| `ANTHROPIC_MODEL` / `RESEARCH_MODEL` | `claude-haiku-5-5` |
| `FO_MODE` | `demo` for labelled simulated actions, or `live` with verified per-user OAuth (see FO_INTEGRATION.md) |
| `ACTIONS_DISABLED` | `false` (set `true` as an emergency stop) |
| `DODO_PAYMENTS_ENVIRONMENT` | `live_mode` for the approved merchant webhook configuration |
| `BILLING_CHECKOUT_ENABLED` | hosted value `true`, explicitly requested after the initial paused preview; local default remains `false` |
| `DODO_PAYMENTS_API_KEY` | approved private Pursuit merchant key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | approved private signing key for the separate Pursuit endpoint |
| `DODO_BUSINESS_ID` | merchant business identifier |
| `DODO_SINGLE_PRODUCT` / `DODO_FOUNDER_PRODUCT` / `DODO_TEAM_PRODUCT` | live product IDs; see DODO_ACCOUNT_SETUP.md |

Run a single instance. The rate limiter is in memory, so multiple instances would need a shared store
(checklist #14).

## 3. Frontend (Vercel)

Import the repo, set **Root Directory** to `frontend`, and set:

| Variable | Value |
|---|---|
| `BACKEND_URL` | `https://<your-render-service>.onrender.com` (server-only, never sent to browsers) |

There are no `NEXT_PUBLIC_*` variables, so no configuration reaches the client bundle.

## 4. Verify

```bash
curl https://<render>/api/health              # {"status":"ok","database":true,...}
curl https://<vercel>/api/health              # same, through the proxy
E2E_BASE_URL=https://<vercel> npx playwright test e2e/experiment-flow.spec.ts   # creates test users
```

Then sign up, create a demo workspace, and check **Settings → Integrations**.

## Manual steps still required

- Neon, Render and Vercel are connected; frontend origin is `https://pursuit-coral.vercel.app`.
- A stable encryption key and verified Fo OAuth connection if you want live actions.
- Hosted AI synthesis is verified; retain server-side keys and monitor the owner's Anthropic balance.
- A custom domain and TLS, if desired (both platforms provide TLS by default).


## Fo chat and free-preview release prerequisites

Before activating this release on the hosted backend, apply Alembic migrations through `22d93a2c4b64` using the migration owner connection. This adds the private Fo chat tables/context and account-level free-preview storage. The Render free-plan start command deliberately does not run owner-level migrations; pushing GitHub code alone does not apply them. Ensure the limited runtime role has the required table privileges after migration.

Provision `OPENROUTER_API_KEY` privately on the backend only, set `FREE_RESEARCH_MODEL=minimax/minimax-m3.1-flash:free`, and enable `FREE_PREVIEW_ENABLED=true` only after checking inference with the hosted account. The default is disabled. Free-provider capacity can fluctuate; no paid fallback is configured. Never add these secrets to Vercel public variables or Git.

For live Fo chat, preserve the existing encryption key, configure `FO_MODE=live` and the exact public OAuth callback origin, and verify a personal Wajo connection with explicit report-sharing consent. Local mock tests do not establish live hosted OAuth/report-context delivery. Fo chat does not use Anthropic research credits.

Production repair on 2026-10-20: the Neon production branch was upgraded from c8ae940f7d21 to 22d93a2c4b64 after live Fo history failed with UndefinedTable. Existing default grants already authorize the runtime role on the new tables. The hosted Fo page loaded successfully after the migration. Health checks now verify required Fo/FirstLook columns with zero-row queries and return 503 if the deployed schema is incomplete. Real Wajo requests still require approved live-mode activation and personal OAuth/report-sharing consent.
