# Pursuit

Pursuit is free: no subscription, checkout or purchased credits. All research uses the configured zero-priced provider.

Pursuit combines company research reports with six GTM experimentation workflows for founders.
Start with your website and business description, then turn uncertain business hypotheses into
measurable experiments, collect source-backed evidence, take human-approved real-world actions
through **Fo**, and get recommendations that show their evidence, counterevidence and limits.

Every use case runs on one shared lifecycle:

**Hypothesis → Research → Evidence → Design → Approval → Action → Outcomes → Analysis → Recommendation**

| Use case | What you get |
|---|---|
| Segment validation | Prospects per segment, interview metrics, strong-pain rate |
| Willingness to pay | Budget owner, pricing feedback, verbal interest kept separate from commitments |
| Messaging experiments | Side-by-side variants, rates with denominators and 95% intervals |
| Problem discovery | Behaviour-based interviews, contradictions, validated vs not |
| Competitive research | Competitor × pricing/features/audience/positioning matrix with sources |
| Funnel diagnosis | CSV/manual import, stage conversions, biggest leak, competing explanations |

Recommendations are `CONTINUE`, `ITERATE`, `PIVOT`, `STOP` or `INCONCLUSIVE`.

## Architecture

```
frontend/  Next.js 16 (App Router, React 19, TS strict, Tailwind 4) — /api/* proxied to the backend
backend/   FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL 16
  app/api/        thin route handlers (auth, workspaces, experiments, evidence, discovery, actions, analysis)
  app/services/   business logic: lifecycle, metrics/stats, funnel, recommendations, executor, fetcher
  app/adapters/fo demo + live MCP adapters for Fo
docs/      security checklist, Fo integration, deployment, incident response
```

- **Auth:** server-side sessions. The httpOnly SameSite=Lax cookie holds only a random token, which is stored hashed. A CSRF header is required on all mutations. Every resource is resolved through workspace membership, so foreign IDs return 404.
- **Calculations:** all arithmetic (rates, Wilson intervals, funnel conversions) is deterministic Python. The free research provider synthesises recommendations. Its output is schema-validated and then guarded server-side.
- **External actions:** nothing runs without explicit human approval. Demo and live are separated in the data model (`origin`, `mode`, `is_demo`), and simulated events never count toward live metrics.

## Local setup

Prerequisites: Docker, Python 3.12+ (tested on 3.14), Node 20+ (tested on 24).

```bash
docker compose up -d                       # Postgres 16 on localhost:5433 (+ pursuit_test DB)

cd backend
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example .env                    # edit as needed; works as-is for local demo mode
alembic upgrade head
uvicorn app.main:app --port 8000

cd ../frontend
npm install
npm run dev                                # http://localhost:3000
```

The frontend proxies `/api/*` to `BACKEND_URL` (default `http://localhost:8000`).

**Low-memory machines (under ~8 GB RAM):** use `npm run serve` instead of `npm run dev`. The Next.js 16 dev server compiles pages on demand in worker processes. On a machine short of memory those workers get killed, and every workspace page fails with a 500 ("Jest worker encountered 2 child process exceptions"). `serve` builds once and runs the production server, which is fast and stable. Don't run it at the same time as `npm run dev`.

### Demo mode

`FO_MODE=demo` (the default) simulates Fo. Approved actions complete as **Simulated** and are labelled
`[DEMO]`, and nothing is sent. During onboarding, choose **Explore with demo data** to get a workspace with
four synthetic experiments. Demo workspaces are always simulated, even when the server runs in live mode.

### AI synthesis

Set `OPENROUTER_API_KEY` in `backend/.env`. All research uses
`FREE_RESEARCH_MODEL=google/gemma-4-31b-it:free`, with a server-enforced zero-price ceiling,
no paid fallback, and no hosted search plugin. Without the key, deterministic calculations
and labelled rule-based recommendations remain available.

Reports analyse fetched public company pages and up to three competitor URLs supplied by the
founder. There is no bundled general web search. Missing independent evidence is a limitation,
not an invitation to invent competitors, customer demand or citations. Free-provider capacity
can fluctuate; a configured key does not guarantee availability. See [free-mode notes](docs/FREE_MODE.md).

## Testing

```bash
# Backend — real FastAPI app against the real Postgres test DB (pursuit_test)
cd backend && python -m scripts.migrate_test && pytest
ruff check . && pip-audit -r requirements.txt

# Frontend
cd frontend && npx tsc --noEmit && npm run lint && npm run build

# Browser E2E — needs backend on :8000 and frontend on :3000. Raise the sign-up
# limit for repeated local runs (the default 10/hour/IP will correctly block them):
REGISTER_LIMIT_PER_HOUR=1000 uvicorn app.main:app --port 8000   # in backend/
npx playwright install chromium && npx playwright test          # in frontend/
```

## Documentation

- [docs/FO_INTEGRATION.md](docs/FO_INTEGRATION.md): what was verified about Fo, how to configure live mode, and what's still unverified
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Neon + Render + Vercel
- [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md): the 45-point audit with evidence
- [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md): credential/data exposure and the emergency stop
- [aboutme.txt](aboutme.txt): per-commit log of what changed

## Local review with the production frontend

After installing dependencies and copying the placeholder configuration as described above:

```powershell
# From the repository root. Rebuild after changing frontend source.
.\scripts\start-local.ps1 -Build
# Open http://localhost:3000
.\scripts\stop-local.ps1
```

The launcher uses Docker PostgreSQL on loopback port 5433, applies migrations, builds if needed,
starts one backend and one production frontend, and waits for health. It refuses occupied ports.
Fo actions are simulated and payments are disabled, regardless of private merchant configuration.
Your private environment files are not changed. Logs and process IDs stay in ignored `.local/`.
Stopping the application leaves PostgreSQL and its stored data intact.

For browser regression runs use `start-local.ps1 -TestMode` to also disable AI calls and raise local
sign-in limits; set `E2E_SKIP_AI=1` in the browser test environment. Do not use that mode for deployment.
The application still enforces paid research allowances. Explore includes a labelled sample and
manual experiments; the launcher does not grant free production credits or bypass billing.

Plans advertised from the backend catalog: Explore $0, Single Report $4.99 once, Founder $11.99/month,
and Team $34.99/month. See `docs/LOCAL_READINESS.md` for scope, verification and release prerequisites.
