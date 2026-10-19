# Payment and owner-access setup

## Completed configuration

- The existing Dodo merchant dashboard reports identity, product and bank verification approved.
- Read-only provider checks verified live Single Report ($15), Founder ($29/month) and Team ($79/month)
  products against the backend catalog, merchant business, currency, billing interval and no-trial rules.
- A separate enabled Pursuit webhook was created at
  `https://pursuit-preview-api.onrender.com/api/billing/webhook`, filtering 20 billing lifecycle events.
  The existing MYDAY endpoint was not modified. Provider signature verification remains mandatory.
- Its signing key was copied privately from the dashboard. The application API key does not have webhook
  secret-retrieval permission; this permission was not expanded. `backend/.env` remains ignored.
- The supplied Anthropic key passed one bounded Haiku model request. No key is shipped to the frontend.
- The additive complimentary-access migration was applied to local PostgreSQL and the existing Neon
  preview. The limited Neon runtime role connected successfully; its credentials were not rotated.
- The explicitly requested owner account/workspace has complimentary Team access locally and in Neon.
  Existing target credentials were preserved. Reports and prospect history remain local; they were not
  silently copied into the hosted database, and sign-in sessions were not migrated.

## Complimentary Team behavior

This is an operator-issued access grant, not a purchased Dodo subscription. It creates no invoice,
customer charge or recurring payment. Team grants include five seats, ten research credits and 200 AI
answers per UTC calendar month. Unused monthly allowances expire; the next month's grant is provisioned
atomically when first used. Repeating the operator command cannot replenish already consumed credits.
Grant revocation immediately removes its unused allowances. Payment-review suspension takes precedence.

The trusted CLI is `python -m scripts.grant_access --email <owner-email> --workspace <uuid> --plan team
--reason <audit-reason> --apply`. There is deliberately no public grant endpoint, email allowlist or
hardcoded privileged password. Granting additional access never cancels an existing paid subscription.

`scripts/provision_owner_access.py` provisions only the selected local owner into the configured Neon
preview. It preserves existing remote credentials and records an audited complimentary grant.
It does not serve as a general data-import or password-reset tool.

## Hosted preparation and release controls

Private Render values have been prepared for the approved Dodo API/signing keys, merchant/product IDs,
Anthropic key, Haiku model defaults and durable report worker. Save/deployment and provider delivery
verification must be confirmed in the dated final execution record; preparation alone is not activation.

`BILLING_CHECKOUT_ENABLED` defaults to false. Connecting merchant credentials enables signed webhook
verification but does not open checkout. Live checkout additionally requires a usable HTTPS frontend
return origin. Localhost and placeholder `.invalid` origins are refused. Existing signed payments can
still fulfill while new checkout is paused; billing management is not disabled by that purchase switch.

Use `scripts/start-local.ps1 -ConfiguredServices` to use private provider credentials locally. Checkout
remains paused and Fo stays simulated. `-TestMode` instead disables real AI calls and cannot be combined
with configured services. Neither option changes the private environment file.

Vercel's current workspace is Hobby. Its fair-use policy restricts commercial use to Pro/Enterprise:
https://vercel.com/docs/limits/fair-use-guidelines . Pro is listed at $20/month before usage/taxes:
https://vercel.com/pricing . Render's observed smallest paid backend compute option is $7/month;
the current Free instance sleeps with inactivity. No hosting upgrade or recurring purchase was made.

Before enabling checkout: finish the commercial hosting choice and public frontend URL, update
`PUBLIC_APP_URL`/`CORS_ORIGINS`, verify secure sessions and live provider delivery, establish support and
service policies, and then explicitly enable checkout. A live charge must be completed by the owner;
neither a redirect nor a complimentary grant is evidence of a successful customer payment.

Account email recovery, production monitoring, backup restoration and other previously documented
release prerequisites remain in `LOCAL_READINESS.md`. Payment setup does not certify them as complete.
