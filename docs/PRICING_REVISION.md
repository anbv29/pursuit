> Historical archive: payment integration was removed from the current application on 2026-10-24. This is not current setup guidance. See FREE_MODE.md. Existing merchant subscriptions require separate cancellation.

# Launch pricing revision — 2026-10-19

| Plan | New USD price | Research credits | AI answers | Members |
| --- | --- | --- | --- | --- |
| Explore | Free | Sample only | 0 | 1 |
| Single Report | 4.99 once | 1 | 10 | 1 |
| Founder | 11.99/month | 3/cycle | 50/cycle | 1 |
| Team | 34.99/month | 10/cycle | 200/cycle | 5 |

Current prices include applicable taxes (superseding the initial tax-exclusive launch below). Research credits still cover a report, refresh
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

## Tax-inclusive correction � 2026-10-19

All three live products now have tax_inclusive=true. Checkout prices remain
USD 4.99 once, USD 11.99/month and USD 34.99/month, including applicable tax.
New sessions request USD and disable currency selection to match the website.
The backend rejects a tax-exclusive product before creating a checkout.
Existing subscription contracts were not migrated, and Fo was not changed.

Live unconfirmed checkout pages verified with India GST:
- Single: subtotal 4.23 + GST 0.76 = total USD 4.99.
- Founder: subtotal 10.16 + GST 1.83 = total USD 11.99.
- Team: subtotal 29.65 + GST 5.34 = total USD 34.99.
A previously created Founder session also recalculated with tax included.
No payment, subscription, customer contact details or card details submitted.
Tax is included in merchant proceeds, rather than charged above these prices.
Bank currency conversion charges remain outside Pursuit's control.
Verification: 28 backend billing/Fo tests passed; 3 desktop/mobile browser checks passed (12.8s). Ruff, ESLint, production compilation and TypeScript passed. Vercel serves the inclusive-tax wording with no old tax-exclusive copy. Render reports revision 4cd8fc5 Deploy succeeded | Live. Local implementation: 7d2f858; deployed merge: 4cd8fc5, preserving newer remote changes dd4bc68. Separate release-worktree commit 140325b was not pushed because the remote had advanced.
