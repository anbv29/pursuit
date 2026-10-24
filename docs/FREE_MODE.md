# Free-only Pursuit

All product features are free: company reports, report questions, refresh, discovery,
sharing, collaboration and the six experiment workflows. No checkout, subscription,
paid tier, payment webhook or purchased-credit enforcement remains in the application.

## Configuration

Set `OPENROUTER_API_KEY` privately on the backend. The current default is
`FREE_RESEARCH_MODEL=dots-studio/dots-3-note-preview:free`. All model calls require zero-priced
routing and disable paid provider fallback and web-search plugins. The existing key
is reused; no research key is placed in client code or Git. No Anthropic SDK/key is needed.

The previous MiniMax endpoint was retired and the Gemma shared pool returned HTTP 429
while this account still had its free allowance. The replacement above answered using
the same existing key and privacy policy. Native JSON-schema output prevents the model
from returning the schema itself instead of a populated report. Local Pydantic and
source-quote validation remain mandatory.

A complete public-site report passed on October 24: eight successful model calls,
167.2 seconds, all report sections present, and no invalid source references or facts
requiring downgrading. This was a resumed checkpoint run after diagnosing the previous
JSON-mode failure, not a claim that every initial attempt succeeded. Source coverage
for that run was one usable public page; unsupported competitors were not invented.

Run `python -m scripts.verify_ai` from backend for one bounded availability check.
Free-provider availability and account-wide quotas still apply; no paid fallback is
permitted. The same private key is retained. Hosted environment overrides must select
the replacement model when deploying; local configuration does not update Render.

## What research actually uses

Full research gathers up to twelve distinct pages from the company homepage, relevant
same-origin links, and up to three competitor roots explicitly supplied in the report
form. It diversifies pricing, customer stories, comparisons, security, integrations and
product/documentation pages within eighteen fetch attempts and two link levels. A
45-second scheduling budget stops further fetches; an in-flight fetch retains its own
bounded timeout. The quick First Look keeps its smaller separate collection budget. Existing URL,
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
