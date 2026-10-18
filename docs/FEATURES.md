# Pursuit: current features and next opportunities

## What founders can do today

### Understand a company and its market
- Enter a website, describe the business, and state what you want to learn.
- Add optional context: stage, current customers, pricing, competitors and region.
- Generate a report covering likely customers, buyer roles, problems, competitors,
  positioning, pricing ideas, draft emails, prospecting channels and tests to run.
- Inspect the source links behind claims and see facts, interpretations and assumptions separately.
- Read reports in Guided or Advanced mode. Guided is the default; the browser remembers the preference.
- Open the startup glossary without leaving the workspace.
- Print or save reports as PDF through the browser.

### Test ideas and learn from results
- Turn a report's recommended test into a tracked experiment with linked evidence.
- Create experiments manually for six questions: who to target, what people will pay,
  which message works, whether the problem matters, how competitors compare, and where sales drop off.
- Set a hypothesis, target audience, success measures and minimum sample size.
- Move through research, evidence, design, approval, action, outcomes, analysis and recommendation.
- Save sources and evidence, including information that challenges the idea.
- Add prospects and record interviews, current workarounds, pain, costs, budget ownership and payment intent.
- Compare message variants using recorded sends, replies and meetings, with denominators and uncertainty ranges.
- Upload a funnel CSV or enter counts manually to see conversion rates, drop-offs and possible explanations.
- Get a rule-based or AI-assisted recommendation to continue, improve, change direction, stop or collect more evidence.
- Review the experiment activity timeline and archive experiments while keeping their records.

### Work with a team and approved actions
- Create accounts and workspaces; add existing users as members.
- Review workspace approvals and outcomes that still need confirmation.
- Request email, calendar and public-research actions through Fo, then approve them explicitly.
- Use clearly labelled simulated actions in demo workspaces.
- Keep simulated outcomes out of live metrics.
- Export workspace records as JSON and delete a workspace as an owner.

## Eight implemented additions

1. **Fo account connection:** connect/reconnect from Settings, encrypted per-user tokens,
   expiring state and PKCE, automatic token refresh, and disconnect. Live account authorization
   still needs the founder's browser consent and a working provider callback registration.
2. **Recoverable report jobs:** PostgreSQL queue, exclusive leases, heartbeat, saved website
   and research checkpoints, bounded retry, cancellation and manual resume. A restarted API
   resumes expired jobs. The queue worker runs with the API; keep one instance running.
3. **Ask your report:** saved question history, source-linked answers, plain-English prompts,
   and limitations. Answers use existing findings; they do not silently conduct new research.
4. **First-week plan:** seven persistent tasks, behavior-based interview questions, notes,
   completion criteria and checkboxes. Completing a task does not create customer evidence.
5. **Corrections and history:** founder-supplied corrections, selective section regeneration,
   immutable earlier snapshots, and comparison against the current report.
6. **Company discovery and delivery checks:** source-backed organization suggestions with
   reachable public websites; fit and buying intent remain unverified. Optional Resend lookup
   checks an executed email against its approved recipient and subject, then records verified
   sends/delivery idempotently. Enter the provider message ID and sync again for newer status.
   This is manual provider reconciliation; reply and meeting synchronization is unsupported.
7. **Sharing and exports:** expiring, revocable, read-only report snapshots. Anyone holding
   the link can read it; review private content before sharing. Workspace exports include
   reports, questions, plans, versions, prospects, sources, criteria, variants, funnel snapshots,
   actions, outcomes, recommendations, usage, budgets and share metadata. OAuth credentials,
   share secrets, password hashes and session tokens are excluded.
8. **AI usage and budgets:** per-workspace model selection for new research, provider token
   records, estimated spend, pre-call budget reservations and historical report-cost ranges.
   Missing usage retains a conservative reservation. Prices are application estimates, not
   provider invoices or a guaranteed billing cap. Haiku 5.5 remains the research default.

## Models

- `RESEARCH_MODEL` defaults to `claude-haiku-5-5` for web research and report writing.
- `ANTHROPIC_MODEL` separately controls AI-assisted experiment recommendations.
- Reading style changes labels and guidance, not the research model or stored findings.
- Newly generated research is prompted to explain acronyms and use plain English.
  Older report bodies are preserved; Guided mode adds easier headings and explanations around them.

## Current limits

- A citation means a retrieved source is linked; the validator does not independently prove that
  the page supports the claim. Founders should inspect important sources themselves.
- External actions still use the API's background executor; the durable queue covers reports.
- Live Fo action execution has not been verified end to end. A free-text completion needs human confirmation.
- Resend reconciliation requires server credentials and an explicit workspace binding.
- Company discovery does not collect personal contact details or prove purchase intent.
- Password reset, account deletion, monitoring and a frontend Content-Security-Policy remain open work.

## Further opportunities

1. Password recovery, account deletion and configurable retention.
2. Verified provider webhooks for delivery/replies and calendar outcomes.
3. Scheduled competitor/pricing refresh with alerts.
4. Contact enrichment only through an authorized provider with provenance.
5. Regional currencies and translated guidance.

These further opportunities are proposals, not currently available features.

## Verification for the reading-mode update

- TypeScript, ESLint, Python lint and formatting checks pass.
- Twelve report API/validation regression tests pass against the local test database with AI mocked.
- Production build passes with `NODE_OPTIONS=--max-old-space-size=1536`.
- Two isolated browser tests pass at 1280px and 390px: default Guided view, Advanced labels,
  glossary, persistent preference, preserved source links, and no horizontal page overflow.
- No paid research call or live Fo action was run for these checks.
