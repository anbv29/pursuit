# Launch pricing revision — 2026-10-19

| Plan | New USD price | Research credits | AI answers | Members |
| --- | --- | --- | --- | --- |
| Explore | Free | Sample only | 0 | 1 |
| Single Report | 4.99 once | 1 | 10 | 1 |
| Founder | 11.99/month | 3/cycle | 50/cycle | 1 |
| Team | 34.99/month | 10/cycle | 200/cycle | 5 |

Prices exclude applicable taxes. Research credits still cover a report, refresh
or discovery, subject to the existing feature gates. No model/provider migration
was included, and Fo code and credentials were not changed.

## Release and provider changes

- Local implementation checkpoint: `46d80bb`.
- Approved pricing-only deployment: `cebd954` on origin/main.
- Local UI commits were excluded from the deployment.
- Product IDs retained: Single `pdt_0Nq10CCPcakUQ0G9PVKUx`,
  Founder `pdt_0Nq10C4N0thwUY5qsH8eM`, Team `pdt_0Nq10BwLw2C0iq1xqIPdf`.
- Live product amounts edited through the signed-in Dodo dashboard.
- Currency, one-time/monthly intervals, no-trial rules and allowances retained.
- Existing subscriptions were not migrated or repriced.
- No changes to MyDay, merchant credentials or webhooks.

## Executed verification

- Billing/usage/Fo backend regression suite: **57 passed in 124.56 seconds**.
- Public catalogue and desktop/mobile billing browser checks: **3 passed**.
- Changed Python files: Ruff lint and format checks passed.
- Changed browser tests: ESLint passed; Git diff checks passed.
- Local app restarted using the previously verified frontend build; frontend
  production source was unchanged, so no fresh local frontend build was needed.
- Live provider verifier: **3 PASS**, signing key configured.
- https://pursuit-coral.vercel.app/api/plans returned 499, 1199 and 3499 cents.
- Deployed public page displayed all three revised prices.
- Three unconfirmed live checkout sessions were created without customer/payment
  details. Their pages displayed $4.99 once, $11.99/month and $34.99/month in USD.
- No payment was submitted or subscription created. This verifies pricing and
  checkout display, not a new completed-payment or renewal test.
- An initial direct Render catalogue request timed out; the Vercel proxy catalogue
  subsequently succeeded. No provider write was retried after an uncertain result.

Screenshots remain in ignored `.local/`; no credentials were committed.
