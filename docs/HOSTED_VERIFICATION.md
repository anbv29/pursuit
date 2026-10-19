# Hosted preview verification — 2026-10-19

Website: https://pursuit-coral.vercel.app
Backend: https://pursuit-preview-api.onrender.com
Application commit: `ada6adb97a02528131f525c17cb66b7b525bbe61`.

## Configuration delivered

- Vercel Hobby project `pursuit`, repository `anbv29/pursuit`, root `frontend`, Next.js.
- Only server-side `BACKEND_URL` is needed on Vercel; no provider credentials were sent there.
- Existing Render Free backend and limited Neon runtime role retained.
- Render origin and CORS allowlist set to the exact public Vercel HTTPS origin.
- Approved Anthropic and live Dodo keys saved privately and compared after persistence.
- Haiku defaults and report worker enabled; new checkout explicitly disabled.
- Requested owner account signed in successfully through Vercel.
- Complimentary Team verified: five seats, monthly ten research credits and 200 AI answers.
- No hosting subscription, card charge or provider customer subscription was created.

## Executed checks

| Check | Actual result |
| --- | --- |
| Backend Ruff and pytest | 149 passed; lint and format passed |
| Frontend lint and production build | Passed; final local rebuild and Vercel build succeeded |
| Local browser regression | 20 passed, one live AI test skipped |
| Hosted browser regression | 20 passed, one live AI test skipped, 4.7 minutes |
| Public `/api/health` through Vercel | `status=ok`, `database=true`, `fo_mode=demo` |
| Hosted real MYDAY report | SUCCEEDED, 58 sources, `claude-haiku-5-5` |
| Report refresh | Completed contents persisted |
| Hosted research credit ledger | CONSUMED in live mode; nine research credits remain |
| Live catalog read-only verification | Single $15, Founder $29/month, Team $79/month passed |
| Provider-signed harmless example | Reached endpoint; HTTP 403 for sample merchant mismatch |
| Secret scanner | Eight known private values; zero tracked/history/client-bundle matches |

The hosted browser suite used synthetic preview accounts. It covered the complete manual experiment
lifecycle, approval enforcement, outsider access denial, responsive layouts, billing availability,
reading modes, account lifecycle and shared report restrictions. The separate real report verifies
actual hosted research; the skipped automated AI test is not counted as passed.

## Remaining commercial-launch limits

This is the user-selected free preview, not a completed paid commercial launch. Render can sleep,
and its startup delay can exceed 50 seconds. Upgrade hosting before the commercial rollout.
New checkout is intentionally paused. A real purchase, renewal, refund and customer portal session
have not been exercised with real customer money. The fixed Dodo example proves transport and
merchant rejection, not fulfillment of a genuine payment. Original 20 billing event filters restored.
Fo remains simulated; real outbound actions require a verified connection and explicit approval.
Production email recovery, monitoring, backup restore and the unresolved security checklist entries
remain release prerequisites in `LOCAL_READINESS.md`; this record does not convert UNKNOWN to PASS.
