# Incident response

Owner: the workspace/deployment owner. Keep a timestamped log of every step you take.

## 0. Emergency stop for external actions (any incident involving Fo)

1. Set `ACTIONS_DISABLED=true` on the backend (Render → Environment) and redeploy or restart.
   - New approvals are refused with "External actions are temporarily disabled".
   - Already-queued actions are marked `FAILED` ("not executed") when picked up.
2. Actions that are already `RUNNING` may still be in progress inside Fo. Check Fo directly from
   the Wajo account and cancel anything unwanted there.
3. Revoke the Fo token in Wajo (see §1) if the agent's behaviour is in doubt.

## 1. Credential exposure

| Credential | Contain | Rotate |
|---|---|---|
| `FO_ACCESS_TOKEN` | §0 emergency stop | Revoke in Wajo, issue a new OAuth token, update the env var, restart |
| `ANTHROPIC_API_KEY` | Unset it (Pursuit falls back to rule-based recommendations) | Revoke in the Anthropic Console, then create a new key |
| `DATABASE_URL` password | Restrict Neon IP allow-list | Reset the role password in Neon, then update `DATABASE_URL` |
| Session tokens | — | `DELETE FROM auth_sessions;` signs everyone out (tokens are stored hashed) |

If a secret reached git: rotate it first, then purge it from history. Rotation is what actually fixes it.

## 2. Data exposure

1. Identify the scope from `audit_events` (per workspace, actor, action, time). Export them before any cleanup.
2. Close the hole (deploy a fix or disable the route), and add a regression test next to the isolation tests in
   `backend/tests/`.
3. Notify the affected workspace owners with what was exposed, when, and what you changed. Follow the legal
   notification duties that apply to prospect personal data in your jurisdiction.

## 3. Compromised user account

1. Revoke the user's sessions: `UPDATE auth_sessions SET revoked_at = now() WHERE user_id = '<id>';`
2. Disable the account: `UPDATE users SET is_active = false WHERE id = '<id>';`
3. Review their `audit_events`, especially `action.approve`, `workspace.export` and `workspace.member_add`.
   Cancel any of their pending actions and remove members they added.
4. Re-enable the account only after the owner has confirmed their identity and the account has a new password
   (there's no self-service password reset yet).

## 4. Afterwards

Write a short post-incident note covering timeline, root cause, fix and follow-ups, and update
`docs/SECURITY_CHECKLIST.md` if a status changed.
