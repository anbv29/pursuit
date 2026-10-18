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
- Export workspace experiment records as JSON and delete a workspace as an owner.

## Models

- `RESEARCH_MODEL` defaults to `claude-haiku-5-5` for web research and report writing.
- `ANTHROPIC_MODEL` separately controls AI-assisted experiment recommendations.
- Reading style changes labels and guidance, not the research model or stored findings.
- Newly generated research is prompted to explain acronyms and use plain English.
  Older report bodies are preserved; Guided mode adds easier headings and explanations around them.

## Current limits

- A citation means a retrieved source is linked; the validator does not independently prove that
  the page supports the claim. Founders should inspect important sources themselves.
- Report and action execution runs inside the API process; it is not a durable worker queue.
- Fo uses a server-wide credential. An in-app OAuth callback, automatic refresh and per-user
  credential isolation are not implemented yet.
- Live Fo action execution has not been verified end to end. A free-text completion needs human confirmation.
- Message delivery/reply events are not automatically synced from an email provider.
- Reports give prospecting ideas, not a verified database of prospect contact details.
- Workspace export does not yet include reports, source records, variants or funnel snapshots.
- Password reset, account deletion, monitoring and a frontend Content-Security-Policy remain open work.

## Potential additions, in suggested order

1. **Reliable jobs and recovery:** a durable queue, cancellation, retries, resumable reports,
   clear progress and a link to the existing job when someone submits twice.
2. **Fo connection inside the app:** sign in, refresh tokens automatically, reconnect on expiry,
   and isolate credentials per user or workspace.
3. **Ask about your report:** source-linked answers and a one-click explanation of unfamiliar text,
   with a visible distinction between the saved report and a new answer.
4. **A guided first-week plan:** turn recommendations into small daily tasks with examples,
   interview scripts and clear completion criteria.
5. **Report editing and history:** correct company facts, rerun selected sections, compare versions,
   and show which evidence changed a recommendation.
6. **Complete data controls:** export all records, delete accounts, reset passwords,
   and configure retention periods.
7. **Prospect discovery:** source-backed company searches, fit explanations and an approval queue;
   any contact enrichment needs a verified provider and privacy/access controls.
8. **Real outreach tracking:** delivery, replies and meetings from verified providers,
   with duplicate protection and clear unsupported metrics.
9. **Report sharing:** view-only links with expiry, access controls and revocation.
10. **Cost controls:** report usage, spend limits, model selection and estimates based on measured usage.
11. **Research refresh:** scheduled competitor or pricing updates with source dates and change summaries.
12. **Regional and language support:** local currencies, market context and translated guidance.

These additions are proposals, not currently available features.

## Verification for the reading-mode update

- TypeScript, ESLint, Python lint and formatting checks pass.
- Twelve report API/validation regression tests pass against the local test database with AI mocked.
- Production build passes with `NODE_OPTIONS=--max-old-space-size=1536`.
- Two isolated browser tests pass at 1280px and 390px: default Guided view, Advanced labels,
  glossary, persistent preference, preserved source links, and no horizontal page overflow.
- No paid research call or live Fo action was run for these checks.
