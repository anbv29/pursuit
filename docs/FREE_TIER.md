> Historical documentation. Website First Look was retired on October 26, 2026. Its page redirects to Company reports and its API routes have been removed. Existing preview data remains exportable. See [FREE_MODE.md](FREE_MODE.md) for the current product.

# Explore: four-section research preview

Explore includes one successful AI research preview per account. It contains only:
1. Executive summary
2. Company snapshot
3. Potential customer segments
4. Customer personas

The preview uses the submitted public page (up to 6,500 extracted characters), optional company description (1,500 characters), and proposed audience (300 characters). Navigation, hidden content and footers are excluded where semantic HTML permits. It does not run web search or claim independent market validation. Website statements, interpretations and hypotheses have distinct labels. Facts require a matching website quote; quote matching does not independently establish that a website claim is true.

## Server configuration

Add `OPENROUTER_API_KEY` to the private `backend/.env`. The default verified model is `minimax/minimax-m3.1-flash:free`. Optional explicit alternatives are `google/gemma-4-31b-it:free` and `google/gemma-4-26b-a4b-it:free`. Set `FREE_PREVIEW_ENABLED=true` after verifying inference with your account. No public environment variable or customer-facing model name is used. OpenCode credentials are not used.

The fixed OpenRouter chat-completions endpoint receives only the extracted public text and the optional submitted details, not private reports, contacts, payment records or Fo credentials. Provider preferences require supported JSON parameters, deny provider data collection and cap input/output token prices at zero. Provider fallback routing is disabled. No paid models or paid search plugins can be selected by user input.

Free availability and capacity can change. Missing credentials or disabled activation keep generation unavailable honestly. Requests use no tools, redirects or automatic retries; responses are size-limited and schema-validated. Output budgets: 2,200 tokens for Gemma with reasoning disabled; 3,500 for MiniMax including its mandatory reasoning, at low effort. Responses must finish fully and pass source-quote checks before they consume the successful preview allowance. No Anthropic tokens, paid research credits or Fo calls are used.

## Persistence and limits

The account-scoped FirstLook row stores the generated four-section content, provenance and outcome. One successful preview per account, maximum five attempts, plus an hourly API limit. Concurrent attempts are serialized. A running attempt cannot be repeated for three minutes. A failed request leaves the successful allowance unused. Users with an earlier rule-based preview can replace it once with the new version; deleting a project cannot reset the account allowance. Project deletion erases saved content and blocks late fetch writes; account deletion cascades the marker. Results are owner-only and included in scoped export.

Paid reports remain on their existing Anthropic flow and plan allowances. Fo chat and OAuth are independent. Remaining research is neither generated nor sent to the client on the free path.

## Verification

Provider mock tests cover the free model ID, input/output bounds, absent tools, rate limits, timeouts, malformed/truncated/oversized replies and quote validation. API tests cover quotas, persistence, workspace isolation, CSRF, SSRF, provider failure, legacy upgrade and deletion races. Browser tests use clearly synthetic API responses to verify four-section rendering at desktop/mobile widths, source quote disclosure, refresh, no extra sections/model names, and unavailable state. Real provider verification requires the user's private key and is reported separately.

## Live verification blocker (2026-10-20)

A real request using the configured key to the documented endpoint returned HTTP 403, type `FreeTierError`, with this provider message: "OpenCode's free tier can only be used from within OpenCode. Download it at https://opencode.ai and keep building."

Therefore third-party free-model access is NOT verified and the preview remains disabled (`FREE_PREVIEW_ENABLED=false`, default). Possessing an OpenCode API key does not make its free tier available to Pursuit. Do not spoof OpenCode clients or route through a CLI to evade this restriction. Activation needs explicit provider permission or a separately supported inference provider and its credentials. Anthropic and Fo remain unchanged. No successful live preview was generated.

Actual verification: 43 backend tests passed (116.53s); 5 browser tests passed (31.8s), including mocked four-section rendering and billing behavior; production build and TypeScript passed. Browser test content is synthetic and does not establish live model availability.

## OpenRouter verification (2026-10-20)

The configured OpenRouter key authenticated successfully; its initial daily free quota was 50/50 remaining. Both free Gemma variants returned upstream HTTP 429 despite the unused account quota. MiniMax M3.1 Flash Free initially rejected disabled reasoning; the adapter now uses mandatory reasoning at low effort with a 3,500-token total output cap. A live public Pancake website preview then completed and passed the four-section schema and source-quote checks. Local activation uses this verified free model. No automatic fallback or relaxation of privacy/zero-price requirements was added.

OpenCode's earlier 403 restriction remains historical and its key is not used by the application. Hosted configuration has not been changed.

Final OpenRouter checks: 30 backend tests passed in 169.82s, 6 browser tests passed in 1.6m. The opt-in live browser test generated a real public-company preview, verified refresh persistence, duplicate denial, anonymous denial and unchanged paid allowances. Ruff/ESLint and diff checks passed. Local preview enabled; hosting unchanged.
