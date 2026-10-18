# Paid-plan verification — 2026-10-18

## Executed checks

- Backend: `.venv\Scripts\pytest.exe -q -rA` — **122 passed** against migrated `pursuit_test`, including 14 new payment, subscription and allowance tests. Subsequent `pytest tests/test_billing_access.py -q` — **3 passed** for seats, downgrade/ownership and model/job budgets. Total **125 passing tests**, with those final three run separately; no application changes followed the full run.
- Backend static checks: `.venv\Scripts\ruff.exe check app tests` — passed.
- Frontend: `npm run lint` — passed; `npx tsc --noEmit` — passed. `NEXT_DIST_DIR=.next-build npm run build` (Windows environment assignment, Node heap 1536MB) — passed, including TypeScript and 18 generated pages.
- Browser: `E2E_SKIP_AI=1 E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test` — **12 passed, 1 skipped**. Includes billing at 1280/390 pixels, no-payment configuration, redirect not activating access, existing experiment loop, concierge approval, read-only shares and responsive demo screens. Billing screen uses labelled synthetic API fixtures; existing experiment/concierge flows use real local API/database with Fo demo mode.
- Backend dependency check: `python -m pip_audit -r requirements.txt --progress-spinner off` — no known vulnerabilities. Frontend `npm audit --omit=dev` — zero vulnerabilities. Existing development-tool advisories documented in the security checklist are not resolved by this production-only audit.
- Alembic billing migrations `507de0003107` and `7dd1f0193ee9` were applied to both local development and test databases. No production migration/deployment was performed.

The first browser attempt could not reach sandboxed local services (12 connection timeouts). Re-running with temporary services reachable at 127.0.0.1 produced the passing results above. The first build attempt hit a sandbox output-directory permission error; the same build succeeded with the required filesystem access.

## Limits

No hosted merchant checkout, real card charge, live renewal/refund or production deployment was tested. Dodo API credentials, product IDs, merchant business ID and signed webhook configuration must be supplied as described in `BILLING.md`. Automated signature tests use the real Dodo SDK verifier and synthetic provider resources, not network calls. The one browser AI-report test is deliberately skipped to prevent paid provider calls; backend report tests use explicit synthetic paid entitlements and controlled research responses.

Existing production security blockers remain in `SECURITY_CHECKLIST.md`. Cost controls use estimates, not invoices. No guaranteed profitability or production readiness is claimed. Changes are local commits only; `aboutme.txt` tracks checkpoint details. Temporary application servers are stopped after verification.
