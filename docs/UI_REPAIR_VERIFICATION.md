# Page repairs — 2026-10-25

The hosted website matched `v3-revamp-backup-25oct`, ten commits ahead of
`main`. Repairs preserve that redesign rather than replacing it with the older
main-branch interface.

## Repairs

- Sign-in and account creation: isolate the faded dot pattern on a decorative
  background layer. Previously its CSS mask faded the form, submit button,
  validation messages and account-switch link along with the background.
- Reports: put the horizontal contents rail above the reading column below the
  desktop breakpoint, constrain its scrolling width and position it below the
  workspace header. Make it available on narrow phones too.
- Experiment creation: correct the invalid desktop grid column declaration and
  restore the New experiment entry in desktop navigation and command search.
- Landing page: reserve space below the footer for the fixed mobile action.
- Remove the unused theme-component import.

## Verification

- Backend: 247 pytest tests passed; Ruff passed.
- Locked backend dependency audit: no known vulnerabilities found.
- Frontend: production build and TypeScript passed. Final lint enforces zero
  warnings.
- Complete browser suite: 47 cases executed, initially 44 passed, two opt-in live
  AI cases skipped, and one new width assertion failed because it measured the
  report title beside the print action instead of the report body. Correcting
  the assertion to measure the summary section resolved it. All five report
  reading/sharing tests then passed, including 430px. All 45 non-live browser
  cases therefore passed across the complete run and targeted correction run.
- Auth regressions cover 320/390/820/1440px and light/dark themes, checking that
  controls have no masked ancestors and that validation and navigation remain
  visible. Auth screenshots were visually inspected.
- Browser coverage includes landing navigation, auth, onboarding, dashboard,
  report list/setup/progress/content, first look, Fo, settings, approvals,
  experiment creation and lifecycle, account password/deletion, shared reports,
  revoked links, error pages, desktop/tablet/phone layouts and keyboard use.

Browser checks used a local production frontend and an isolated local PostgreSQL
database. Fo actions were simulated and external AI calls were disabled. Fixture
checks do not establish live provider availability or real outbound delivery.
Screenshots and traces remain in ignored local test-output directories.
