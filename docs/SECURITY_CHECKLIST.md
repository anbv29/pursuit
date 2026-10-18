# Pursuit security checklist (45 points)

Audited 2026-10-18 against the code at the commit that adds this file. Statuses are `PASS`, `FAIL`, `UNKNOWN`
or `NOT_APPLICABLE`. A PASS cites concrete evidence, and UNKNOWN is never counted as PASS.
Paths are relative to the repo root. Tests are in `backend/tests/` and `frontend/e2e/`.

**Summary:** 37 PASS (several with stated limits) · 3 FAIL · 5 UNKNOWN · 0 NOT_APPLICABLE.
**Production readiness: NOT claimed.** UNKNOWN items #4, #6, #12, #15 and #44 need the real production
environment, and FAIL items #18, #38 and #43 are open.

## Repository, secrets and deployment

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | No secrets in source, history, bundles, logs | PASS | `git log -p --all` grep for `sk-ant-`, AWS keys, private keys, GitHub/Slack tokens found nothing. Only `.env.example` (placeholders) is tracked, and `.gitignore` excludes `.env*`. `.next/static` grep for ANTHROPIC/FO_ACCESS_TOKEN/BACKEND_URL/backend host found nothing. Logs never include request bodies. CI runs gitleaks (`.github/workflows/ci.yml`). |
| 2 | Production credentials server-side and rotatable | PASS | Only backend env vars hold `ANTHROPIC_API_KEY` and `FO_ACCESS_TOKEN` (`backend/app/core/config.py`, as `SecretStr`). The frontend has no `NEXT_PUBLIC_*` config. Rotation means changing the env var and restarting (`docs/FO_INTEGRATION.md`). |
| 3 | No default credentials, debug bypasses, permissive prod defaults | PASS | `APP_ENV=production` refuses insecure cookies and wildcard CORS (`config.py::_production_guards`) and disables `/docs` and `/openapi.json` (`main.py`). The `docker-compose.yml` password is local-only and documented as such. There is no auth bypass flag. |
| 4 | Dev / staging / prod isolated | UNKNOWN | Dev and test use separate databases (`pursuit`, `pursuit_test`). No staging or production environment exists yet. |
| 5 | Dependencies locked, maintained, checked | PASS | Python deps are pinned exactly (`backend/requirements*.txt`) and `package-lock.json` is committed. `pip-audit` reports no known vulnerabilities after upgrading starlette/python-multipart/pytest (commit "chore: upgrade backend dependencies…"). `npm audit --omit=dev` reports 0. **Accepted:** 5 high advisories in dev-only tooling (`braces` via `eslint-config-next`), where the only fix is a breaking downgrade. |
| 6 | Deployment permissions restricted | UNKNOWN | Not deployed. Render, Vercel and Neon access must be limited to the owners. CI uses `permissions: contents: read`. |
| 7 | Clean clone configures reproducibly | PASS | `README.md` setup (Docker Postgres, `pip install -r`, `alembic upgrade head`, `npm install`). CI repeats it from scratch, including migration up/down/up. *(CI was written but hasn't run, since nothing is pushed. Every step was run locally.)* |

## Authentication and authorization

| # | Check | Status | Evidence |
|---|---|---|---|
| 8 | Private routes and APIs require auth | PASS | Every non-auth router depends on `current_session` / `workspace_member` (`app/api/deps.py`). `test_anonymous_cannot_access_workspaces`. E2E: "anonymous visitors are sent to sign in". |
| 9 | Server-side authorization on sensitive endpoints | PASS | Owner-only guards for delete, export, audit and add-member (`workspace_owner`). `test_member_access_but_not_owner_actions`, `test_export_is_owner_only`. Prospect emails are masked for non-owners (`api/discovery.py`). |
| 10 | Changing IDs can't expose other users' data | PASS | Experiments, actions, evidence, sources, prospects, variants and outcomes are loaded with `experiment_id`/`workspace_id` filters, and foreign IDs return 404. `test_cross_tenant_experiment_access_denied`, `test_cannot_link_foreign_source`, `test_other_user_cannot_approve_or_request`, plus the E2E outsider check. |
| 11 | Workspace / tenant isolation throughout | PASS | Same as #10. Idempotency keys are namespaced per experiment (`services/actions.py::_key`), and the dashboard and approvals queries filter by workspace. |
| 12 | DB / admin least privilege | UNKNOWN | Locally the app runs as the database owner. `docs/DEPLOYMENT.md` prescribes a non-admin runtime role on Neon, but it hasn't been configured. |
| 13 | Sessions / cookies secure | PASS | 256-bit random token, stored only as SHA-256 (`core/security.py`, `models/identity.py::AuthSession`). Cookie is httpOnly, SameSite=Lax, Secure in production (`test_session_cookie_is_httponly`). Expiry and logout revocation are covered (`test_register_login_me_logout`). Argon2id password hashing. Login errors are generic with timing equalisation (`test_bad_login_is_generic`). Password recovery isn't implemented, so it can't be insecure. Listed under #38 as missing functionality. |
| 14 | Rate limits on auth abuse and sensitive endpoints | PASS (single instance) | Login per IP and per email, registration per IP, fetch, actions, recommendations and integrations (`core/ratelimit.py` and call sites). `test_login_rate_limited`. Client IP comes from trusted proxy hops, so spoofed `X-Forwarded-For` is ignored (`test_client_ip_uses_trusted_hop…`). **Limit:** the store is in memory, so a multi-instance deploy needs Redis. The `TRUSTED_PROXY_HOPS=2` value must be confirmed against real headers after deploy. |

## Database, input and application security

| # | Check | Status | Evidence |
|---|---|---|---|
| 15 | DB access least privilege and policies | UNKNOWN | App-level tenant filters are tested (#10). There's no row-level security and no restricted role yet (#12). |
| 16 | Server-side input validation | PASS | Pydantic models enforce lengths, enums, ranges, email and http(s) URLs (`app/schemas/*`). `test_invalid_experiment_rejected`, `test_evidence_validation`, `test_invalid_action_inputs`, `test_weak_password_and_bad_email_rejected`. |
| 17 | Parameterized SQL, no shell or dynamic code | PASS | Only SQLAlchemy expressions are used. The one `text()` is the constant `SELECT 1` health probe. There's no `subprocess`, `eval` or `exec` (ruff `S` rules pass). |
| 18 | Output encoding, redirects, security headers | FAIL (partial) | React escapes all rendered text, and there's no `dangerouslySetInnerHTML`. User links are http(s)-only and open with `rel="noopener noreferrer nofollow"`. The API sends nosniff, DENY framing, strict CSP and no-store (`main.py`, checked in `test_health`). The frontend sends nosniff, DENY, Referrer-Policy and Permissions-Policy (`next.config.ts`). **Open:** the frontend has no Content-Security-Policy yet (it needs nonce support for Next inline scripts). |
| 19 | CORS, CSRF, server-side fetching controlled | PASS | CORS is limited to configured origins and methods, and wildcards are rejected in production. CSRF needs a per-session token header on every mutation (`test_csrf_required_for_mutations`). Server-side fetch: see #33. |
| 20 | Uploads, exports, generated files restricted | PASS | CSV import requires a `.csv` extension, 100 KB cap, UTF-8, strict header, and row validation, and it rejects formula-injection prefixes (`services/funnel.py`, `test_parse_reports_row_errors`). Export is owner-only and audited, and it's generated in memory. Nothing is stored on disk. |
| 21 | Errors don't leak internals | PASS | Domain errors map to `{code, message}` (`core/errors.py`). Unhandled exceptions return a generic 500 and log server-side (`main.py`). The health check returns only booleans and the mode. |

## Fo and AI security

| # | Check | Status | Evidence |
|---|---|---|---|
| 22 | Fo credentials server-side, minimally scoped | PASS | `FO_ACCESS_TOKEN` exists only in backend env. The only scope offered is `mcp`, which was verified from OAuth metadata. Pursuit calls only `ask_fo`/`get_fo_reply`, and settings never return the token. |
| 23 | Each action authorized for user, workspace, target | PASS | Requests and decisions go through `experiment_dep` (membership). The action kind must be allowed for the use case, and prospect and variant must belong to the experiment (`services/actions.py::request`). Tests: `test_action_kind_restricted_by_use_case`, `test_other_user_cannot_approve_or_request`. |
| 24 | Retrieved content and tool output treated as untrusted | PASS | Fetched pages are stored as excerpts and never executed. Script and style content is stripped (`test_extract_ignores_scripts_and_gets_title`). Fo replies are treated as reports and need human confirmation (`test_live_completion_requires_human_confirmation`). Evidence reaches Claude only inside a JSON data block (`services/ai.py`). |
| 25 | Model instructions can't override server controls | PASS | The model has no tools. Its output is schema-validated, and then the server clamps confidence, filters cited IDs and forbids overturning INCONCLUSIVE (`test_ai_cannot_override_inconclusive`). Fo instructions are built deterministically. User content is fenced and fence markers are stripped (`test_instruction_fences_injected_content`). |
| 26 | Consequential actions need explicit approval | PASS | Actions are created as `PENDING_APPROVAL`, and only an approval queues execution (`test_nothing_executes_without_approval`). The UI confirmation dialog shows the exact recipient and content and warns about live mode (E2E). |
| 27 | Agents have only the tools needed | PASS | Claude gets zero tools. Fo is limited to three action kinds with a single recipient and an explicit "no other action" instruction (`services/instructions.py`). **Residual risk:** Fo is an autonomous agent, and Pursuit can't technically stop it exceeding the instruction. See FO_INTEGRATION.md. |
| 28 | AI-generated URLs, HTML, SQL, commands, arguments validated | PASS | AI output is never executed or rendered as HTML. Only schema-validated text fields are stored. Action arguments come from human-entered, validated fields, not from AI. |
| 29 | Sensitive data to models and logs minimized | PASS | The Claude payload carries aggregate metrics and evidence claims only, with no prospect names or emails (`ai.py::_payload`). Audit details contain no secrets or message bodies. Exception logs include only the path. |
| 30 | Timeouts, retries, budgets, quotas | PASS | Fo HTTP timeout, poll deadline, at most 3 poll errors, and no resubmission (`executor.py`). Claude has a timeout and `max_retries=1`. A 24h per-workspace action budget is enforced (`_check_budget`). Fetch has timeout, byte cap and redirect cap. Rate limits are covered in #14. |
| 31 | Agent execution auditable | PASS | Request, approve/reject, result, confirm and cancel are written to `audit_events` with actor, target and timestamp. They show in the experiment timeline and the owner-only `/audit` endpoint. |

## Data and external actions

| # | Check | Status | Evidence |
|---|---|---|---|
| 32 | Provenance on prospects and research | PASS | `Source.url`, `retrieved_at`, `content_sha256` and `origin`. `Prospect.source_url`. Evidence links to a source (`test_source_and_evidence_provenance`). |
| 33 | SSRF / redirects / size / timeouts in fetching | PASS (known gap) | `services/fetcher.py` allows http(s) on default ports only. Every hop must resolve to public IPs. Max 3 redirects, a byte cap, timeouts, and text types only (`test_blocks_internal_and_non_http_targets`, `test_fetch_blocks_ssrf_via_api`). **Known gap:** DNS rebinding between the check and the connect isn't fully closed. |
| 34 | Outreach authorization, duplicate/excess safeguards | PASS | Approval is required. Content-fingerprint idempotency rejects duplicates, and an atomic compare-and-set prevents double approval (`test_duplicate_action_and_double_approval_blocked`). There's a daily budget and a rate limit. |
| 35 | Queued / sent / delivered / failed / cancelled / unknown not conflated | PASS | Distinct statuses with documented semantics (`services/actions.py` docstring). The UI labels "Queued" as "not executed yet". `delivered` is shown as "not reported" when absent. `test_demo_action_lifecycle` asserts that QUEUED is returned before execution. |
| 36 | Idempotency and concurrency | PASS | Unique `idempotency_key`. `UPDATE … WHERE status=…` for decide, cancel, claim-for-execution and confirm. The demo adapter is idempotent per key. Frontend `useAction` blocks double submits. |
| 37 | Metrics from persisted events, demo labelled | PASS | Metrics are computed only from DB rows (`services/metrics.py`). Demo rows are excluded from live experiments and reported separately (`excluded_simulated_outcomes`, found and fixed via the E2E test). Recommendations carry `includes_demo_data`. |
| 38 | Data deletion and export | FAIL (partial) | Workspace export (owner, JSON) and hard delete with FK cascade are tested. **Missing:** user account deletion, password reset, and per-prospect erasure across workspaces. |
| 39 | Provider failures never become false success | PASS | Credentials rejected → FAILED (`test_revoked_credentials_fail_without_false_success`). Simulated failure → FAILED. Errors after submit → UNKNOWN. A live completion still needs confirmation. |

## Testing and operations

| # | Check | Status | Evidence |
|---|---|---|---|
| 40 | Tests exercise real routes and production-like paths | PASS | 63 pytest tests hit the real FastAPI app and real Postgres. 5 Playwright tests drive the real UI → Next proxy → API → DB, including a desktop and mobile responsive run. |
| 41 | Tests cover anonymous, cross-user, invalid input, prompt injection, unauthorized agent actions | PASS | See #8, #10, #16, #25 and #23. |
| 42 | Secret scanning, static analysis, dependency checks before release | PASS (locally) | Run locally: ruff (including the `S` security rules), pip-audit, npm audit, and a history grep for secrets. CI is configured with gitleaks too, but hasn't run. |
| 43 | Logging, monitoring, alerting, redaction | FAIL | Structured error logging exists and secrets are never logged. **Missing:** monitoring and alerting (no Sentry or uptime alerts). Render's health check is the only signal. |
| 44 | Backup restore and migration recovery tested | UNKNOWN | Migration downgrade/upgrade was tested locally. Neon backup restoration hasn't been tested. |
| 45 | Incident response procedure | PASS | `docs/INCIDENT_RESPONSE.md` covers credential exposure, data exposure, compromised accounts, and the emergency agent stop (`ACTIONS_DISABLED`, `test_emergency_stop_blocks_approval`). |

### Also tracked
- **NOT_APPLICABLE:** third-party analytics integrations (none are claimed or configured).
- UNKNOWN (#4, #6, #12, #15, #44) and FAIL (#18, #38, #43) items block a production-readiness claim.
