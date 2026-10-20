# Deep research

Paid reports now plan three company-specific decision questions, investigate buyers,
workarounds, competition and distribution, then deliberately search for counterevidence.
A separate structured challenge pass produces up to four ranked strategic insights.
Existing report sections follow from that evidence. Existing prices and allowances
have not changed.

Each insight contains a reasoning chain, commercial implication, counterargument,
an experiment, and different decisions for supported and rejected hypotheses.
Quotations must match retrieved source excerpts. Missing evidence results in a
low-confidence hypothesis, never a fabricated observation. Public statements do
not establish customer demand, causality or statistical confidence. Domain grouping
is a conservative publisher heuristic, not proof of independent ownership.

## Limits and recovery

- Paid research: three tool-enabled passes, each with at most eight searches and
  two provider fetches. No automatic tool-turn continuation. Search allocations are
  saved before calls; lease recovery does not reset them.
- Source checking: at most 12 distinct source URLs, interleaved across the three
  passes so early results do not exclude counterevidence. Existing SSRF protections,
  redirect checks, byte limits and fetch timeouts apply.
- Each paid provider request has a 90-second inactivity timeout and no SDK retries.
  Investigation checks a five-minute elapsed budget between stages; an in-flight
  provider or fetch request can extend elapsed time beyond that checkpoint limit.
- `RESEARCH_JOB_LIMIT_USD=1.0` caps conservative estimated reservations per billing
  use. Workspace and grant budgets still apply. This is not an invoice guarantee;
  unknown calls retain reservations. No customer overage is charged.
- Planning, completed investigation passes, source excerpts, the decision brief,
  and completed synthesis parts are checkpointed in the existing report JSON.
  Synthesis caches are invalidated if evidence/context changes.
- Explicit customer retries reserve an allowance and renew only missing-pass search
  allocations. Already completed work is retained. Cancellation/lease ownership is
  checked before stages and checkpoint writes.

No schema migration is needed. Older reports still render without a decision brief.
Legacy claim records remain readable; newly researched facts require supporting
quotes from retrieved excerpts and are downgraded if unsupported.

## Free preview

The free path remains on the explicitly approved zero-priced MiniMax OpenRouter
model. A public catalogue check on 2026-10-20 found DeepSeek V4.1 Flash was paid;
the owner chose to retain the zero-cost provider instead of funding DeepSeek calls.

It checks the supplied company page and at most two relevant, same-origin linked
pages. It makes exactly two bounded inference requests: draft, then challenge.
There are no Anthropic calls, paid fallback, web-search tools or enabled web plugin.
Provider prompt/completion price caps remain zero. Account/provider rate limits
still apply; free availability is not guaranteed.

The four top-level sections stay unchanged. The company snapshot can include a
source-checked overlooked angle, its counterargument and a test. Unsupported
quotations are removed and their associated claims become assumptions. Invalid
final JSON fails safely and does not consume the successful-preview allowance.
This is deeper company-page analysis, not independent market-wide research.

Assessment version 4 allows users with older previews one upgraded run. Failed-run
and concurrency safeguards remain in place. No free preview consumes paid research
or report-question credits.

## Fo and privacy

Fo authentication, action approvals, integrations and chat quotas are unchanged.
Sharing the selected generated report continues to require the existing explicit
Wajo consent. The enhanced report content is included through that same snapshot
mechanism; raw fetched pages and private inputs are not newly attached to Fo.

## Verification and release gate

Synthetic tests cover citation rejection/downgrading, publisher duplication,
checkpoint recovery, cancellation, explicit retry budgets, synthesis cache reuse,
free-only routing, malformed responses and the four-section limit. Browser tests
cover the evidence/challenge UI, reload rendering and narrow/wide screens.

Local live smoke artifacts are intentionally ignored under `.local/`. They use
public MyDay pages. A successful smoke test is not a broad quality benchmark.
Before advertising superiority or changing allowances, review at least 20 varied
companies with a human rubric: company specificity, directly supported claims,
counterevidence, decision usefulness, realistic experiments and generic-advice rate.
Record provider usage, wall time, failed attempts and unknown reservations. Compare
against existing saved reports; do not use source count as a quality score.

Deployment requires publishing these local changes and restarting the backend.
The existing public website is unchanged until the owner authorizes that release.

## Local verification on 2026-10-20

- Full backend run: 208 passed. After the final evidence-editor changes, the 55-test research/free-preview/Fo-context regression selection passed.
- Five browser checks passed for paid evidence cards and free four-section previews at 390px and 1280px, including reload rendering and provider-unavailable state.
- Frontend production build, TypeScript, ESLint, backend Ruff and diff checks passed.
- Real MiniMax preview: two public MyDay pages, four sections, one source-checked angle; a separate local API run persisted its result with zero paid research/question credits consumed.
- Real paid pipeline: completed with 12 source records. Its first brief attempt truncated; corrected output limits allowed a saved-progress retry to succeed. Completed-call estimates totalled USD 0.384142, with one earlier UNKNOWN reservation excluded from that number.
- A new local report replayed that saved public evidence through the final skeptical editor and synthesis: succeeded in four provider calls, estimated USD 0.022345, no UNKNOWN calls, no repeated searches. These observations are not a fresh-run average or an invoice.
- Verification was local; no paid-plan changes or Fo actions were performed. The owner subsequently authorized Git publication. Hosted deployment verification and the 20-company quality/margin evaluation remain release tasks.
