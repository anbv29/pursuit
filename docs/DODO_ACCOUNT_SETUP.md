# Merchant account setup status

Verified in the signed-in Dodo Payments dashboard on 2026-10-18, in **Test Mode**.

| Pursuit product | Provider ID | Price |
| --- | --- | --- |
| Single Report | `pdt_0Nq0ymq7q3a9OvSzuXC5W` | USD 15 once |
| Founder | `pdt_0Nq0yvWRkSD2ZWVGViyqL` | USD 29 every month |
| Team | `pdt_0Nq0z4kfQzlsWHXj4SQJS` | USD 79 every month |

Created with SaaS tax classification, fixed USD prices, no trial, no discounts, no PPP, and no localized prices. Existing unrelated MyDay product was preserved. Catalog IDs and business ID were saved to the ignored local backend configuration. No credentials are included in this document or Git.

![Verified Dodo test products](dodo-test-products.png)

## Pending

- API key: no existing test keys. Prepared `Pursuit local test backend` with Payments/Refunds/Subscriptions/Products **Read**, Customers/Checkout Sessions **Write**, and all other permissions **None**. Persistent credential creation requires action-time confirmation; it has not been created.
- Webhook: dashboard has no endpoints. Requires publicly reachable HTTPS URL ending in `/api/billing/webhook`; localhost is not reachable by Dodo. No endpoint or signing secret created yet.
- Customer portal: not yet verified using a configured API key and real test customer.
- Hosted checkout, provider signature delivery, credits, cancellation and renewal: not yet verified against the merchant account. Local fixture tests are documented separately in `BILLING_VERIFICATION.md`.
- Live-mode products and keys have not been created. No real or simulated checkout payment was executed during account configuration.
