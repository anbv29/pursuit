# Free-only Pursuit

All product features are free: company reports, report questions, refresh, discovery,
sharing, collaboration and the six experiment workflows. No checkout, subscription,
paid tier, payment webhook or purchased-credit enforcement remains in the application.

## Configuration

Set `OPENROUTER_API_KEY` privately on the backend. The current default is
`FREE_RESEARCH_MODEL=google/gemma-4-31b-it:free`. All model calls require zero-priced
routing and disable paid provider fallback and web-search plugins. The existing key
is reused; no research key is placed in client code or Git. No Anthropic SDK/key is needed.

The previously used MiniMax free launch endpoint was retired on October 22, 2026.
Live checks on October 24 found the two remaining privacy-compatible Gemma endpoints
rate-limited. Do not claim live research is available merely because configuration exists.
Use `python -m scripts.verify_ai` from backend to perform one bounded provider check.
No privacy restrictions are weakened to obtain a different free endpoint.

## What research actually uses

The server fetches the company homepage, up to four relevant same-origin pages, and
up to three competitor URLs explicitly supplied in the report form. Existing URL,
SSRF, redirect, response-size and timeout protections remain in force. The same fetched
evidence supports three focused investigations, a skeptical review and report synthesis.
There is no general web search service included. Competitors, prospects and benchmarks
may remain missing when no accessible evidence supports them. Citations are source-linked;
a company's own marketing is not independently verified customer behaviour.

The quick four-section First Look remains available alongside the full free report.
Its one-success-per-account limit prevents repeatedly claiming an onboarding preview;
it does not restrict access to full reports. Failed preview requests do not consume it.

## Safety and fair use

Authentication, workspace authorization, CSRF, approval controls and audit history remain.
Members can collaborate without a Team subscription; owner-only operations remain owner-only.
The existing report limit is 20 requests per rolling day per workspace and one active report
at a time. Other route-level abuse limits and the 25-member safety cap still apply.
Provider limits may be lower. Free access does not mean infinite provider capacity.

Fo is independent: personal Wajo connection, consented report context and human approval
remain unchanged. Fo's own account permissions, capacity and terms still apply.

## Historical data and rollout

Existing reports and payment records are preserved. Historical payment tables/foreign keys
remain for retention and safe migrations; they no longer grant or deny feature access.
A workspace with an existing live subscription still requires external cancellation before
deletion, to avoid orphaning recurring charges. Removing checkout code does not cancel an
existing merchant subscription or delete a merchant account.

This conversion is local until explicitly pushed/deployed. At rollout, provision the free
key/model in Render and remove retired paid-provider variables. Review and cancel any actual
legacy subscriptions through the payment provider before announcing that recurring charges
have ended. Existing encryption keys and Fo settings must be preserved.
