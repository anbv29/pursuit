# Eight-feature verification — 2026-10-18

Implementation and automated verification are complete. Live provider verification and deployment
remain outstanding; this document does not claim production readiness.

## Executed checks

- PostgreSQL development migration: `alembic upgrade head` succeeded.
- Isolated test database migration: `PYTHONPATH=. python scripts/migrate_test.py` succeeded.
- Backend: `pytest -q -rA` — **92 passed**, using FastAPI TestClient and local PostgreSQL.
  Provider calls were mocked; no paid AI calls or live external actions were made.
- Additional delivery regression after audit/locking changes: `pytest tests/test_delivery_tracking.py -q -rA`
  — **4 passed**.
- Backend: `ruff format backend/app`, `ruff check backend/app` succeeded.
- Frontend: `npm run lint` and `npx tsc --noEmit` succeeded.
- Production: `NEXT_DIST_DIR=.next-build NODE_OPTIONS=--max-old-space-size=1536 npx next build --webpack`
  succeeded, including all 17 generated pages. On Windows use the equivalent environment assignment.
- Browser: `npx playwright test e2e/reading-mode.spec.ts --project=desktop` — **3 passed**.
  These isolated browser tests cover 1280px/390px layouts, reading preference persistence,
  source preservation, saved plan tasks, questions and read-only/revoked sharing.
  Browser API fixtures are synthetic; PostgreSQL persistence is covered by backend tests.
- Generated phone-width screenshot inspected after the final styling correction; no page overflow.
- `npm audit` reports **5 high development-tooling advisories**, through braces/micromatch/
  fast-glob and Next's ESLint configuration. The suggested automatic fix is a breaking downgrade;
  it was not applied. These remain unresolved.

## Failures encountered and resolved

- A test migration initially used an assumed local password and failed authentication. The test
  runner now reads the configured test database URL without printing it.
- Initial delivery tests used the wrong request field. Corrected to the actual typed API field,
  `provider_message_id`, then reran successfully.
- Initial lint included generated `.next-build` files. Added the build-directory exclusion.
- Turbopack failed while creating its CSS worker process. Webpack compiled but revealed the
  old Tailwind integration only handled Turbopack. Added the official PostCSS integration;
  rebuilt successfully and verified styled desktop/mobile pages in a browser.
- Browser checkbox verification initially assumed an immediate synchronous state change.
  Updated it to wait for the persisted asynchronous update. The question test now opens the
  visible disclosure control. Final browser run passes.

## Explicit limits

- Fo consent, real refresh-token rotation and one consequential approved action need verification
  with the founder's live account. Automated OAuth tests cover state, isolation and refresh behavior.
- Resend needs backend credentials and a workspace binding. Reconciliation is manual, by provider
  message ID. No automatic reply/meeting synchronization or unsupported analytics is claimed.
- Discovery checks provenance and website reachability, not semantic truth or buying intent.
- Provider token usage and estimated budgets need observation on a real billed request.
  Uncertain requests retain reservations; provider-side limits remain necessary.
- The report queue is durable, but the external-action executor is still process-local.
- Existing security checklist FAIL/UNKNOWN findings remain open; no deployment was attempted.
- All changes are local commits. No push occurred. `aboutme.txt` contains per-checkpoint details.
