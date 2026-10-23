# Deep research in free mode

All report features use the configured zero-priced OpenRouter model. There are no
purchased credits, subscription gates or paid-model fallbacks.

## Pipeline

1. Fetch the company homepage and up to four relevant same-origin pages.
2. Fetch up to three competitor source URLs supplied by the founder.
3. Plan company-specific questions and run three bounded investigations.
4. Challenge the reasoning with counterarguments and missing evidence.
5. Synthesize the report, strategic insights and next experiments.

Sources include URLs, retrieval timestamps and excerpts. Existing SSRF, redirect,
response-size and timeout protections apply. Missing evidence must remain missing.
There is no general web search service. Marketing claims do not establish customer
demand or independent validation. Competitors and prospects may remain empty.

## Recovery and limits

Checkpointed investigation allocations are bounded to three passes. Explicit retry
uses completed checkpoints. Job leases, elapsed-time limits and one-active-report
controls remain in force.

The adapter requires zero-priced routing, disables paid fallback and search plugins,
rejects tools, and validates structured output locally. Rate limits produce a failure,
not a paid request. Failed previews do not consume the successful-preview allowance.

Fo retains its separate Wajo connection and approval controls.
See [FREE_MODE.md](FREE_MODE.md) for configuration and provider availability, and
[FREE_MODE_VERIFICATION.md](FREE_MODE_VERIFICATION.md) for verification evidence.
