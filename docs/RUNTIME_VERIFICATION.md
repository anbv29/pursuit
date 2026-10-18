# Running application verification — 2026-10-18

**Result: local demo works; the complete live product is not ready.**

## Running services

- PostgreSQL: Docker Compose service `db`, local port 5433.
- FastAPI: http://127.0.0.1:8000 — startup succeeded.
- Frontend: http://localhost:3000 — production build.
- Direct `/api/health` and frontend-proxied `/api/health` both returned HTTP 200:
  `{"status":"ok","database":true,"fo_mode":"demo"}`.
- Development and isolated test database migrations completed successfully.

## Executed verification

- `pytest -q -rA`: **93 passed**, real FastAPI test application and isolated PostgreSQL.
  AI and provider calls in this suite are mocked.
- `npx playwright test`: **8 passed, 1 skipped** across desktop and mobile projects.
  The real-browser experiment loop includes signup, workspace creation, evidence, criteria,
  lifecycle transitions, approval, simulated execution, outcome, recommendation, reload
  persistence, and rejection of another user's access.
- Browser coverage also includes signup validation, anonymous route protection, demo dashboard,
  discovery, messaging, funnel and settings screens; guided/advanced report views, saved tasks,
  report questions and revoked share links use explicitly synthetic API fixtures.
- `ruff check backend/app backend/tests`: passed.
- `npm run lint`, `npx tsc --noEmit`: passed.
- `NEXT_DIST_DIR=.next-build NODE_OPTIONS=--max-old-space-size=1536 npm run build`: passed,
  including TypeScript and all 17 generated pages. The frontend was stopped during the build
  and restarted afterward. A concurrent standalone type check briefly failed while generated
  files were being replaced; the sequential rerun passed. Avoid these checks concurrently.
- `pip-audit -r requirements.txt`: no known vulnerabilities found.
- `npm audit --omit=dev`: zero vulnerabilities. The full development dependency audit from
  the previous verification still has five high advisories; those have not been fixed here.

## Failures found and addressed

- A backend test helper exceeded the configured line length: reformatted and lint rerun.
- The full experiment browser test selected the glossary's first definition instead of the
  evidence count. Scoped the assertion to the experiment panel; the complete flow now passes.
- The live report browser test attempted research without a configured API key and received
  HTTP 400. It now checks the authenticated integration status first and explicitly skips
  with the missing-key reason. This skip is an unresolved verification requirement, not a pass.
- Standard build/serve commands now use the previously verified Webpack builder so users do
  not silently return to the locally unreliable Turbopack CSS subprocess.

## Blocking completion

1. The running backend reports AI disabled: no usable `ANTHROPIC_API_KEY` is configured.
   Company reports, report answers and AI prospect discovery cannot operate live until it is
   provided privately in backend/.env and the backend is restarted. Chat credentials cannot
   substitute for an application API key. Then rerun `npx playwright test e2e/report.spec.ts`.
2. Fo is in demo mode. Real OAuth consent, token refresh and one specifically approved action
   still require live verification. Automated checks do not certify a real send.
3. Resend delivery verification needs provider credentials and workspace binding; no real
   provider email was verified in this run. Reply/meeting synchronization remains unsupported.
4. Existing production-readiness findings remain open: account recovery/deletion, monitoring,
   frontend CSP, backup restoration, deployment access and production tenant/database controls.
   See `SECURITY_CHECKLIST.md`; no production deployment is claimed.

No real outreach was sent. Browser runs created synthetic accounts/workspaces in the local
development database. No user records were deleted. No Git push was performed.
