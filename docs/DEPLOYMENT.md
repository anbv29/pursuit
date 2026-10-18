# Deployment: Neon + Render + Vercel

**Status: not deployed.** It needs your Neon, Render and Vercel accounts. Nothing was pushed or deployed.

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
| Pre-deploy | `alembic upgrade head` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/api/health` (returns 503 if the database is unreachable) |

Environment variables (set the secrets in the dashboard):

| Variable | Value |
|---|---|
| `APP_ENV` | `production` (enforces secure cookies, no wildcard CORS, hides `/docs`) |
| `DATABASE_URL` | Neon connection string |
| `COOKIE_SECURE` | `true` |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://pursuit.vercel.app` |
| `ANTHROPIC_API_KEY` | optional |
| `FO_MODE` / `FO_ACCESS_TOKEN` | `demo`, or `live` plus a token (see FO_INTEGRATION.md) |
| `ACTIONS_DISABLED` | `false` (set `true` as an emergency stop) |

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

- Neon project and connection string, Render service, and Vercel project.
- A production Fo OAuth token if you want live actions.
- An `ANTHROPIC_API_KEY` for production, if you want AI synthesis.
- A custom domain and TLS, if desired (both platforms provide TLS by default).
