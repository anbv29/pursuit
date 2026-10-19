# Local readiness and release scope

## What Pursuit does

Company reports combine a website and business description with source-backed research into customers,
competitors, pricing, positioning, outreach angles, experiment suggestions and a first-week plan.
They distinguish facts, interpretations and assumptions. A report is not proof that customers will buy.
Reports support questions, section refresh, discovery, history, print/PDF, controlled sharing and saved plans.
Availability depends on the configured AI service and workspace allowances.

Six manual workflows share persisted hypotheses, evidence, success criteria, approval, action tracking,
outcomes and recommendations: customer segments, willingness to pay, messaging, problem discovery,
competition and funnel diagnosis. CSV funnel arithmetic and rates are calculated by application code.
Guided and advanced reading modes retain the same underlying evidence.

## Plans (USD, per workspace)

| Plan | Price | Research credits | AI answers | Members |
| --- | --- | --- | --- | --- |
| Explore | Free | Sample only | Rule-based recommendations | 1 |
| Single Report | $15 once | 1 | 10 | 1 |
| Founder | $29/month | 3/month | 50/month | 1 |
| Team | $79/month | 10/month | 200/month | 5 |

Research credits cover reports, section refreshes or discovery searches. Refresh/discovery and share links
require Founder or Team. A discovery attempt consumes its credit even with zero matches. Monthly
allowances expire; single-purchase credits do not. Plans do not impose automatic overages. Applicable
taxes and external provider costs are separate. Checkout and verified webhook fulfillment enforce access;
an unverified return URL never unlocks a plan. Public pricing reads `/api/plans`, not a duplicate price list.

## Local operation

Use the root `scripts/start-local.ps1 -Build` and `scripts/stop-local.ps1` after README dependency setup.
Docker must be running; no reset or volume deletion is needed. The application is at localhost:3000.
Only local PostgreSQL is used by these scripts. Payments are disabled and Fo is simulated. `-TestMode`
also disables AI and increases local authentication limits. Normal startup uses an optional private AI key;
new paid reports still require legitimate workspace credits. Sample workspaces cannot be billed.

The scripts preserve private `.env` files, bind application servers and the database to loopback, reject
occupied application ports, keep logs in ignored `.local/`, and stop only processes whose saved start time
matches. Run with `-Build` after frontend changes; the existing compiled bundle is otherwise reused.

## Account and data controls

Account security is accessible from the account menu or `/account`. Password changes require the current
password and revoke all sessions. Session issuance is serialized with rotation/deletion. Account deletion
requires reauthentication and exact confirmation. Owned workspaces must be exported/deleted first;
workspace deletion refuses unresolved subscription obligations. Shared workspace records stay with their
workspace; membership and sign-in credentials are deleted and actor references are anonymized.
This does not promise deletion from provider systems, legal billing records or backups.

## Release prerequisites still requiring the real environment

- Verify an authenticated live AI report with an entitled workspace and an actual provider budget.
- Verify Fo consent, token refresh and one narrowly approved live action with the intended account.
- Verify hosted checkout, signed webhook delivery, subscription lifecycle and customer portal policy
  against the final HTTPS origins. Local provider mocks are not live-payment certification.
- Configure final URLs, secure cookies, trusted proxy hops, secret custody and restricted database role.
- Configure error monitoring, uptime alerting and owner response. Local logs are not hosted alerting.
- Demonstrate backup restoration for the deployed database; local migration rollback is not a backup test.
- Establish verified-email/password-recovery delivery and an operator identity-recovery procedure.
- Supply the business's actual privacy, retention, support and paid-service terms before public paid launch.
- Review development dependency advisories separately from runtime audits; never force a breaking downgrade.

Frontend CSP restricts sources, objects, framing and forms, but permits inline Next scripts/styles. It is a
baseline policy, not a nonce-based strict CSP. Rate limiting is bounded but in-process: use a shared limiter
before multiple backend instances. Review the 45-point security checklist with deployment evidence.

Production readiness is not certified by this local review. See the dated verification record for executed
commands and results; no unexecuted test or provider capability should be treated as verified.
