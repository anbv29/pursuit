# Local verification — 2026-10-19

Scope: user's revamped frontend, FastAPI backend, Docker PostgreSQL and local production build.
Nothing was pushed or deployed by this review. Private configuration and unrelated user files were preserved.

## Executed checks

Commands below ran from backend/frontend as applicable using installed project dependencies.

| Check | Actual result |
| --- | --- |
| `python -m ruff check .` | PASS; includes static security rules. |
| `python -m ruff format --check .` | PASS; final source set 145 files. |
| `python -m scripts.migrate_test` | PASS; isolated local test DB migrated. Initial direct-file invocation failed its module import; corrected to package invocation. |
| `python -m scripts.check_test_migrations` | PASS; guarded local upgrade/downgrade-to-base/upgrade of all migrations. Never run against hosted data. |
| `python -m pytest` | **141 passed**, 145.35 seconds, final business-code revision. |
| `python -m pip_audit -r requirements.txt` | PASS; no known backend vulnerabilities. |
| `npx tsc --noEmit` | PASS; production build also completed TypeScript checks. |
| `npm run lint` | PASS; final browser-spec addition separately linted. |
| `npm run build` with `NEXT_DIST_DIR=.next-build` | PASS; 20 prerendered/static pages and dynamic workspace routes. Build used bounded Node memory. |
| `npm audit --omit=dev` | PASS; zero runtime vulnerabilities. |
| Full `npm audit --json` | **FAIL**; five high development-tooling advisories rooted in braces stack exhaustion, GHSA-vfj7-8cjw-p6xm. Automatic fix proposes a major Next tooling downgrade; not applied. |
| `python -m scripts.scan_local_secrets` | PASS in scoped scan: six private configured values plus common signatures; zero source/history/browser-bundle matches, 52 JS bundles. Does not guarantee absence of unknown secrets or certify hosted logs. |
| `E2E_SKIP_AI=1 npx playwright test` | **20 passed, 1 skipped**, 2.0 minutes, final serial run against the production frontend and real local API. |
| Local start/stop scripts | PASS; readiness returned 200; stop released both ports 3000/8000; startup repeated successfully. |
| `docker compose port db 5432` | PASS; only `127.0.0.1:5433`. |

## Browser coverage and limits

- Full persisted hypothesis/evidence/approval/simulated action/outcome/recommendation flow, refresh and outsider denial.
- Desktop/phone billing, all four public tiers, pricing retry, explanatory workflow copy and security headers.
- Account password rotation, sign-in with the new password, confirmed deletion and rejected subsequent login.
- Blocked browser storage still allows exactly one workspace creation and dashboard access.
- Concierge simulated invitations, approval and recorded booking; real persisted interview/outcome rows.
- Guided/advanced reading, read-only/revoked shared reports, dark dashboard, reports, settings and approvals.
- Desktop and mobile demo navigation with no horizontal overflow or captured browser page errors.

Some UI smoke/report-display cases intercept the API with explicitly synthetic fixtures; the experiment,
concierge, account, storage and demo-navigation paths use the real local backend. Functional browser tests
request reduced motion to avoid depending on decorative entrance timing. This is not a full WCAG audit.
The live AI report test was explicitly skipped: it requires a real provider call and a legitimately entitled
workspace. Live payment checkout, webhook delivery and live Fo actions were not executed in this review.

The initial browser run reported 12 passes, four failures and one skip. Three failures were stale selectors
after the user's two-step onboarding/password visibility redesign. One was a trace-directory collision
caused by starting a second runner; subsequent runs were serial. Selectors were updated, failures rerun,
and the final entire suite passed as stated above. No failures were hidden by retry configuration.

## Operational fixes found through execution

Docker initially crashed on an inaccessible zero-byte IPC socket. The stale socket was removed through
WSL after stopping the crashed desktop processes. Docker restarted with its existing database volume.
No factory reset or volume deletion was performed.

Local lifecycle verification exposed a PowerShell JSON date conversion mismatch in process identity checks;
the scripts now store numeric start ticks and actual port release was confirmed. The loopback-only Docker
binding also exposed slow Windows IPv6 fallback, so local launch uses explicit IPv4 and Alembic connections
have a five-second connection timeout.

The application is left running at `http://localhost:3000` in safe local test mode: Fo simulated, payments
disabled, AI disabled for this verification session. `stop-local.ps1` stops these application processes;
`start-local.ps1 -Build` starts normal local review with any configured private AI key. Paid allowances
remain enforced; no production credit grants were fabricated for the UI.

## Release decision

**Local review is ready. Public production release is not certified.** The remaining live-provider,
email-recovery, policy, monitoring, least-privilege and backup-restoration prerequisites are listed in
`LOCAL_READINESS.md` and the current 45-point matrix in `SECURITY_CHECKLIST.md`.

CI now includes an isolated browser job with no live provider credentials and failure-only synthetic traces.
Its YAML/configuration is validated locally; the GitHub-hosted workflow has not run for these local commits.
Commit details are recorded in `aboutme.txt` and Git history. No co-author trailers were added.

## Implementation checkpoints

- `894121c` — research/validation copy and catalog-backed public pricing.
- `1b6e553` — public-address pinning for research fetches and adversarial tests.
- `538299e` — reauthenticated account security API and session revocation.
- `cfef165` — account screen, resilient requests, storage and sign-out handling.
- `7b7000e` — resource bounds and production origin guards.
- `7e60355` — six-workflow explanation, FAQ, CSP and private-page indexing controls.
- `a96205d` — safe local start/stop tooling and blank-provider guards.
- `bdb9c2f` — serialized session issuance and shared-record deletion regression.
- `aa7f414` — current security matrix, plan details and explicit release prerequisites.
- `1c1040d` — workspace-loading isolation, UI errors, lifecycle and updated browser tests.
- `ce949fa` — reproducible setup, secret scanner and bounded IPv4 migration startup.
