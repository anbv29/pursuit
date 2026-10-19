# Pursuit security checklist (45 points)

## Current local review (2026-10-19)

The following matrix supersedes historical local assertions where they differ. PASS means the stated
local control has evidence; it does not certify a deployment. External settings, legal retention and live
provider behavior remain unverified. Critical FAIL/UNKNOWN findings block a production-ready claim.

| # | Status | Current evidence and limits |
| --- | --- | --- |
| 1 | PASS | `scripts/scan_local_secrets.py` checked six known private values plus common signatures: zero matches in tracked files, Git patches or 52 browser JS bundles. `.gitignore` excludes credentials. This scoped scan cannot prove every unknown secret absent; hosted logs remain #29/#43. |
| 2 | UNKNOWN | `core/config.py` uses server-side SecretStr; hosted custody, scope and rotation require operator evidence. |
| 3 | PASS | `config.py` rejects insecure production cookies, wildcard/non-HTTPS origins and invalid session TTL. `test_runtime_guards.py`; no auth bypass. Local launcher disables payments. |
| 4 | UNKNOWN | Local `pursuit`/`pursuit_test` separation exists; final production isolation is not verified. |
| 5 | FAIL | Runtime npm audit and backend pip-audit are clean; full npm audit reports five high development-only advisories rooted in braces. Suggested fix downgrades Next tooling across a major version. |
| 6 | UNKNOWN | Deployment account permissions were not certified by this local review. |
| 7 | PASS | README setup, pinned dependencies, Alembic and local launcher; clean-environment CI configuration exists. Fresh-machine setup was not repeated. |
| 8 | PASS | `api/deps.py` authenticates private APIs; auth tests cover anonymous access. `/account` uses RequireAuth; authorization remains server-side. |
| 9 | PASS | Owner/member dependencies protect resource mutation, billing, export and deletion; auth/billing tests. |
| 10 | PASS | Foreign resources return no data: experiments/evidence/actions/report/billing isolation tests. |
| 11 | PASS | Workspace-scoped service queries and membership dependencies; full API regression suite uses distinct users. |
| 12 | UNKNOWN | Local role owns the database. Final hosted runtime privileges require inspection. |
| 13 | PASS | Hashed sessions, Argon2, CSRF, secure production cookies; account tests verify all-session revocation. `auth.py` serializes login with password changes. Recovery is a separate open requirement (#38). |
| 14 | PASS | Bounded single-instance sliding limiter and capacity/expiry tests; multi-instance shared store remains required. |
| 15 | UNKNOWN | Application isolation is tested; production role/RLS/administrative access are not certified. |
| 16 | PASS | Pydantic server schemas, literal account confirmation, SecretStr passwords and invalid-input API tests. |
| 17 | PASS | SQLAlchemy parameterization; Ruff S rules; no model output executes as code or shell commands. |
| 18 | PASS | React escaping, baseline frontend CSP and private noindex headers (`next.config.ts`); inline scripts/styles remain allowed. API CSP is stricter. Nonce-based CSP remains a strengthening opportunity. |
| 19 | PASS | CSRF tests, explicit HTTPS production origins and pinned research fetching; no arbitrary client-selected callback origin. |
| 20 | PASS | Bounded CSV validation and owner-only JSON export; funnel/export tests. |
| 21 | PASS | Controlled domain errors and generic unexpected 500s; client timeouts preserve action uncertainty. Health reports no credentials. |
| 22 | UNKNOWN | Fo credentials stay server-side/encrypted, but actual provider permission scope and live access were not reverified. |
| 23 | PASS | Experiment membership, target and action-kind checks in actions/concierge routes; adversarial action tests. |
| 24 | PASS | Fetch extraction strips executable content; instructions fence untrusted content; adversarial prompt tests. |
| 25 | PASS | Server approval, allowance and resource checks remain outside model control; AI guard tests. |
| 26 | PASS | Explicit approval and human confirmation requirements; actions and concierge API tests. |
| 27 | UNKNOWN | Narrow Fo instructions exist; Pursuit cannot enforce the upstream agent's complete tool permissions. Verify provider account policy before live use. |
| 28 | PASS | Schema validation, URL/recipient checks, allowlisted action types; models are not given SQL or shell tools. |
| 29 | UNKNOWN | Aggregate synthesis and redacted callback/share access logs exist; hosted proxy and provider logging need review. |
| 30 | PASS | Provider timeouts, bounded retry/budget reservations, leased report worker, bounded DB connect/pool waits. Runtime/job/allowance tests. |
| 31 | PASS | Persisted approvals, execution transitions and audit events; action/worker regression tests. |
| 32 | PASS | Sources include provenance/timestamps; evidence/report tests validate persistence. |
| 33 | PASS | `fetcher.py` pins public DNS results, preserves Host/TLS name, checks each redirect and caps bytes/time. Fourteen fetcher tests passed. |
| 34 | PASS | Approval, single-target instructions, daily limits and idempotent action requests; action tests. Provider enforcement still requires #27. |
| 35 | PASS | Queued/executed/delivered/unknown are distinct; delivery and concierge provider tests. |
| 36 | PASS | Unique keys, database locks, leases and approval claim checks; billing/action/worker tests. |
| 37 | PASS | Persisted event metrics separate demo origin; synthetic fixtures are explicit. Public marketing labels fictional examples. |
| 38 | FAIL | Owner export/workspace deletion and reauthenticated account deletion implemented; shared records intentionally retained. Verified-email recovery and provider/backup retention erasure procedures remain incomplete. |
| 39 | PASS | Provider failures and uncertain outcomes do not grant success/credits; billing, Fo and worker failure-path tests. |
| 40 | PASS | Real FastAPI routes against isolated PostgreSQL; current browser results recorded separately in verification document. |
| 41 | PASS | Anonymous, cross-user, invalid-input, injection and unauthorized-action tests; account deletion preserves shared workspace. |
| 42 | FAIL | Ruff/static checks, count-only secret scan and runtime dependency audits executed; development advisories remain (#5). CI gitleaks has not been re-executed locally. |
| 43 | FAIL | Local logs and access redaction exist. Hosted alerting, monitoring and proxy redaction are not configured/verified. |
| 44 | UNKNOWN | Local migration up/down/up passed; hosted backup restoration and disaster recovery not demonstrated. |
| 45 | PASS | `docs/INCIDENT_RESPONSE.md` covers credentials, data exposure, compromised accounts and emergency agent shutdown; operational drill not performed. |

Full execution results and local limitations are in `LOCAL_READINESS.md` and the dated verification record.
All older matrices below remain historical context, not a current production certification.

## Paid-plan addendum (2026-10-18)

This addendum does not change historical production UNKNOWN/FAIL findings below.

| Checks | Status | New evidence / limits |
| --- | --- | --- |
| 2, 3 | PASS (local) | Dodo keys are SecretStr server configuration; production rejects configured test-mode billing (`core/config.py`). Placeholder-only additions in `.env.example`. No frontend key variables. Merchant rotation/permissions remain unverified. |
| 8–11, 14, 16 | PASS (local) | Owner-only checkout/portal, member-only allowance summary, fixed server product allowlist and endpoint rate limits (`api/billing.py`). `test_billing_payments.py` exercises cross-workspace denial and invalid plans. |
| 19, 21, 28 | PASS (local billing scope) | Webhook endpoint checks bounded raw-body size and real SDK signature verification; returns generic errors. Hosted redirect destinations require HTTPS on Dodo domains (`payment_provider.py`, `payment_webhook.py`). Checkout is CSRF-protected; signed webhook is intentionally exempt. |
| 23, 25, 30 | PASS (local) | Paid operations reserve database allowances before AI. Model selection cannot bypass included Haiku/cost limits. Revoked/expired grants stop queued provider calls (`ai_usage.py`, `entitlements.py`, `test_billing_allowances.py`). Cost estimates need provider-side limits; no guarantee of actual gross margin is claimed. |
| 31, 35, 36, 39 | PASS (local) | Verified provider resources are bound to stored orders/customer/environment. Webhook claims and grants share a transaction; duplicate IDs/cycles are unique. Refund/dispute suspension survives late paid events. Current subscription state is retrieved under workspace lock (`billing_fulfillment.py`, `billing_webhooks.py`; payment/subscription tests). |
| 37, 40, 41 | PASS (local) | Billing tests use signed synthetic events and isolated Postgres, never real payment credentials. Free sample report is explicitly synthetic. Full existing backend regression suite and desktop/mobile browser checks were executed; final counts are in `docs/BILLING_VERIFICATION.md`. |
| 4, 6, 12, 15, 44 | UNKNOWN | Merchant live configuration, deployment account permissions, production DB privileges and backup restoration are not verified by local tests. |
| 18, 38, 43 | FAIL (existing) | Historical CSP, complete account erasure/recovery, and operational alerting gaps remain. Billing adds no claim that these are resolved. |

Real hosted checkout, subscription renewal, customer-portal policy and live merchant webhook delivery remain **UNKNOWN** until configured and tested with the merchant account. This blocks a claim of live-payment or production readiness. See `docs/BILLING.md` for required setup and reconciliation responsibilities.

## Eight-feature addendum (2026-10-18)

The original matrix below is historical evidence, not a fresh production certification.
The new verification record is `docs/FEATURE_VERIFICATION.md`. Existing FAIL/UNKNOWN findings
remain unresolved. Newly added controls and their concrete evidence:

- #2/#13/#22: `services/fo_oauth.py` encrypts per-user credentials with Fernet, validates
  one-time state/PKCE, and serializes refresh; `tests/test_fo_oauth.py` covers isolation.
  Production key custody and real provider consent remain UNKNOWN.
- #9/#10/#11: report tools, sharing management and usage settings enforce workspace access;
  `tests/test_report_tools.py`, `test_sharing_usage.py`, `test_prospect_discovery.py` and
  `test_delivery_tracking.py` exercise foreign-user rejection.
- #30/#36: `services/ai_usage.py` locks workspace budget reservations; `report_worker.py`
  claims leased jobs and `reports.py` uses atomic completion guarded by owner and status.
  `test_sharing_usage.py` and `test_report_jobs.py` exercise these controls.
- #35/#37/#39: `services/delivery_tracking.py` verifies approved recipient/subject and
  deduplicates imported events. Provider errors do not imply success (`test_delivery_tracking.py`).
- #38: exports now include reports and associated records, excluding OAuth and share secrets
  (`api/overview.py`, `test_sharing_usage.py`). Account deletion/recovery remain incomplete.
- #43: share bearer paths and OAuth callback queries are redacted by `core/log_redaction.py`;
  monitoring and alerting remain missing. Deployment proxy/frontend logs need separate review.
- #5/#42: frontend audit still reports five high development-only advisories; automatic
  breaking downgrade was not applied. Do not treat this as a clean dependency audit.

---

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
