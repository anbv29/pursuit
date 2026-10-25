# Founder workflows

## Interview capture

Open any experiment and choose **Interview notes**. Paste a conversation or
upload UTF-8 `.txt` / `.md` notes (up to 80,000 characters and 320 KB). Notes are
shared with that workspace; they are not sent to an AI provider.

Pursuit suggests up to 20 literal highlights using wording associated with pain,
objections, current solutions and buying signals. These are review suggestions,
not speaker analysis, proof of demand, or verified willingness to pay. Interviewer
questions are excluded where clearly labelled. Add a quotation yourself when
the wording-based suggestions miss something.

For each finding, review its interpretation and relationship to the hypothesis,
then choose **Add reviewed finding**. Only that explicit action creates evidence.
The evidence retains the exact quotation, original note location and transcript
hash. Findings are labelled interpretations; source links reopen the saved notes.
Retries do not duplicate accepted evidence. Deleted evidence can be reviewed again.
Saving notes never increments completed-interview or commitment metrics.

The picker shows the latest 100 captures. Existing evidence links can still open
older captures. Workspace-owner export includes captures and highlights.

## Experiment reminders

Set a reminder from an experiment overview or **Your priorities**. Date/time entry
uses the browser's local timezone and is stored with timezone information.
Overdue reminders appear in founder priorities. Reminders can be completed,
reopened, or moved to tomorrow at 9am local time. Archived experiments are excluded
from active reminder lists.

These are **in-app reminders**, not email, operating-system notifications or a
background delivery service. Attention panels refresh once a minute while visible
and when the user returns to the browser. The reminder list shows up to 200 records,
with open reminders ahead of completed ones.

## Founder priorities

The dashboard and **Your priorities** page explain up to five suggested next
steps from saved work. Rules consider overdue reminders, pending/unknown actions,
missing success criteria, newly recorded outcomes, missing evidence, saved
recommendations and experiments inactive for seven days. New workspaces receive
an actionable starting point.

No model is asked to invent priorities or likelihood-of-success scores. Simulated
evidence and outcomes do not become live signals; demo workspaces remain labelled.
Priorities never approve or execute external actions.

## Release order

Migration `23ea4b3d5c75` adds `interview_captures`, `interview_highlights` and
`experiment_reminders`. Existing records and tables are retained.

1. Apply `alembic upgrade head` using the authorized migration role.
2. Ensure the limited runtime role can select/insert/update/delete the new tables
   through the existing default privileges or explicit grants.
3. Deploy the backend, verify `/api/health`, then deploy the frontend.

Readiness checks exercise all three new tables without reading customer data.
Old frontend/backend versions can coexist with the added tables during rollout;
do not drop the new tables to roll back application code after users save data.

Backend tests cover exact quotations, duplicate acceptance, Unicode offsets,
workspace boundaries, CSRF, demo provenance, exports and reminder persistence.
The browser feature tests exercise uploads, review, evidence deep links,
priorities and reminder completion/snoozing/reopening on desktop and phone.

Verification on 2026-10-25: the complete backend run passed 258 tests. A final
16-test workflow/readiness run also passed, including an added regression for
recent activity and simulated outcomes. The complete browser run passed 47 cases
with two opt-in live AI cases skipped. Both final feature flows passed again in
light/dark mode, including navigation and project-switch draft isolation.
TypeScript, zero-warning ESLint, Ruff and the production build passed.
