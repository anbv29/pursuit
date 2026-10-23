# Free-mode verification, 2026-10-24

## Implemented locally

- Full reports, questions, refresh, discovery, sharing and collaboration are free.
- Anthropic and Dodo runtime dependencies, checkout and payment routes are removed.
- Existing OpenRouter key is reused server-side; zero-price routing is mandatory.
- Authentication, workspace isolation, abuse limits and Fo consent remain enforced.
- Historical database records and migrations are preserved.

## Executed checks

- Backend full suite: 197 passed in 214.17 seconds.
- Final targeted regression suite: 45 passed in 53.69 seconds.
  Covered free access, provider isolation, deep research, report jobs and tools,
  report lifecycle and Fo chat after the final runtime changes.
- Frontend production build: passed, including TypeScript checking.
- Frontend ESLint: passed for source and changed free-access/readiness tests.
- Backend Ruff: passed for application and tests.
- Playwright: 10 passed in 46.5 seconds on the local production frontend.
  Covered free access at mobile/desktop sizes, preview states and deep evidence UI.
- Git whitespace checks: passed at checkpoints.

Commands included backend pytest, frontend npm run build, npx eslint,
backend Ruff, and Playwright with free-access, first-look and deep-research specs.
Browser checks used mocked application responses where their fixtures specify them;
they do not prove live provider availability.

The first backend run had three compatibility failures after billing removal.
The stale assertions and usage metadata handling were corrected before the passing run.
An earlier database attempt could not run until local Docker/PostgreSQL was available.

## Live research is blocked

The existing MiniMax free endpoint returned retirement information dated October 22.
OpenRouter lists the replacement Gemma endpoints as free, but live checks with the
existing key returned upstream rate limits. A different candidate had no endpoint
compatible with the existing privacy policy. No paid request or privacy relaxation
was used. A complete live report on the replacement model remains unverified.

Current default: google/gemma-4-31b-it:free. Retry the bounded backend
python -m scripts.verify_ai check when provider capacity returns. Configuration
alone is not evidence of live availability. No free-provider uptime is guaranteed.

## Rollout boundaries

Changes are local commits only. Nothing was pushed or deployed in this task.
Hosted settings still need the free provider configuration at deployment.
Removing payment code does not cancel subscriptions at the merchant. Review and
cancel any actual recurring subscriptions separately before announcing billing ended.
The historical security checklist is not a fresh production certification.

## Commit history

Inspect all conversion checkpoints with:

git log --reverse --oneline a187d4c..HEAD

aboutme.txt records the work and verification at each checkpoint. Unrelated local
files and private environment files are excluded from the commits.
