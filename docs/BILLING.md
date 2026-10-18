# Paid plans

Billing is per workspace in USD, plus taxes shown by Dodo Payments at checkout.

| Plan | Price | Research credits | AI answers | Members |
| --- | --- | --- | --- | --- |
| Explore | Free | Sample report only | Rule-based analysis only | 1 |
| Single Report | $15 once | 1 | 10 | 1 |
| Founder | $29/month | 3 per cycle | 50 per cycle | 1 |
| Team | $79/month | 10 per cycle | 200 per cycle | 5 |

A research credit covers a full report, selected refresh, or discovery search (including zero matches). Refresh, discovery and creation of share links require an active subscription. Questions and optional AI experiment analysis consume one AI answer. Manual experiments, first-week plans, saved data and rule-based analysis remain available. Monthly allowances expire; one-time credits do not. No automatic overage billing. Failed work releases customer credits, but attempted provider calls retain their cost reservations.

## Configure the merchant account

1. In Dodo test mode, create one fixed-price USD $15 one-time product and fixed-price USD $29 and $79 monthly products. Disable trials, pay-what-you-want, discounts, PPP and localized prices for these products. The server validates the catalog before checkout.
2. Set the server-only `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=test_mode`, `DODO_BUSINESS_ID`, `DODO_SINGLE_PRODUCT`, `DODO_FOUNDER_PRODUCT`, and `DODO_TEAM_PRODUCT`. See `.env.example`; never use a public frontend prefix for credentials.
3. Register a publicly reachable HTTPS webhook at `/api/billing/webhook`. Subscribe to payment succeeded/failed/cancelled, subscription lifecycle events, refund.succeeded and dispute events. Enable the hosted customer portal for subscription changes and cancellation. Set `PUBLIC_APP_URL` to the actual frontend origin for returns.
4. Apply Alembic migrations and restart the backend. Open a non-demo workspace's Plans & billing. Missing configuration disables purchases explicitly; demo workspaces cannot buy plans.
5. Complete a test checkout and verify signed webhook delivery, allowance activation, duplicate delivery, cancellation, renewal, failed payment and refund behavior before using live mode. Local automated provider fixtures do not replace this merchant-account test.
6. For production create separate live products/keys, set `DODO_PAYMENTS_ENVIRONMENT=live_mode`, deploy with HTTPS and correct cookie/CORS settings, and verify a real authorized purchase. Production refuses configured test-mode billing.

## Enforcement and operations

- Checkout return URLs never activate access. Signed notifications trigger server retrieval of the authoritative payment/subscription and checks of merchant, workspace order, customer, product and environment. All quota writes and delivery claims commit atomically.
- Workspace locks protect the last credit; use records distinguish reserved, consumed and released. Subscription grants are keyed by subscription and billing cycle. Old notifications re-fetch current state. Refunded/disputed payments suspend paid access for operator review; late success notifications cannot restore it.
- Only owners can purchase or open the portal. Existing subscriptions must be changed there, preventing accidental double subscriptions. Cancel and wait for the paid period to end before deleting a subscribed workspace.
- Team includes the owner in five seats. After downgrade extra members retain read access but cannot mutate workspace resources. Owners can remove members from Settings. Saved evidence is not deleted on downgrade.
- Unknown checkout outcomes block a blind retry for 24 hours; inspect the merchant dashboard and delivery logs before reconciling them. Never manually grant based on a browser redirect. Partial refunds deliberately require review. There is no public administrative entitlement bypass.
- Included requests use Haiku 5.5. The AI ledger enforces estimated per-job limits ($2 research, $0.10 answer), a 30% of plan-price grant budget, and the workspace monthly safety limit. These are conservative estimates, not provider invoices or a guaranteed margin; configure provider-side hard limits and monitor actual charges. Unknown calls remain reserved. Fo/email costs are separate.
- Export includes billing records with checkout URLs removed. Operational retention, tax/accounting policy, support reconciliation and merchant live verification remain deployment responsibilities.

Implementation: `backend/app/services/{checkout,billing_fulfillment,billing_webhooks,entitlements,ai_usage}.py`, `backend/app/api/{billing,payment_webhook}.py`, and `frontend/src/components/billing.tsx`. Signed offline tests use the real SDK verifier and synthetic provider resources; no card is charged by the automated suite.
