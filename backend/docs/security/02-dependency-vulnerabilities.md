# 02. Patch vulnerable dependencies

- **Severity:** High (one critical advisory)
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `backend/package.json`, `backend/package-lock.json`,
  `frontend/package-lock.json`

## Context

`npm audit` reported known vulnerabilities in both apps.

**Backend (shipped to production):**

| Package | Was | Now | Why it matters here |
|---|---|---|---|
| `proxy-addr` | 2.0.7 | 2.0.8 | **Critical.** Express uses it to compute `req.ip` from `X-Forwarded-For` when `trust proxy` is set. The per-IP auth rate limit (performance record 12) depends on `req.ip` being right. |
| `body-parser` | 1.20.6 | 1.20.9 | High. Parses every JSON body, including the webhook's raw body. |
| `qs` | 6.15.3 | 6.16.2 | Moderate. Denial of service and array-limit bypass advisories. Used for query strings and (before record 09) urlencoded bodies. |
| `mongoose` | 8.24.4 | 8.24.10 | High. Every database call goes through it. |
| `express` | 4.22.2 | 4.22.3 | Pulls in the fixed `qs`. 4.22.2 pinned a vulnerable range, so `npm audit fix` alone couldn't clear it. |

**Frontend:** `vite` 8.2.2 → 8.3.8 (high: dev-server file disclosure and
cross-origin script execution, and `launch-editor` command injection on
some editors). These affect the **development server**, not the static build
deployed to Vercel, but developers run it on their own machines.

## Decision

- Ran `npm audit fix` in both apps.
- Upgraded Express to `^4.22.3` and raised Mongoose's floor to `^8.24.10`
  in `package.json`, so a fresh install can't resolve to a vulnerable
  version.
- Stayed on Express 4. Express 5 changes routing and error handling and
  deserves its own change.

## Consequences

- `npm audit` reports **0 vulnerabilities** in both apps.
- **Vite 8.3 needs Node 20.19 or newer** (or 22.12+). The frontend build
  fails on Node 20.16. Vercel uses a supported version by default; check
  local machines.
- `npm audit fix` dropped the platform-specific bundler binary
  (`@rolldown/binding-darwin-arm64`) from `node_modules`, a known npm bug
  with optional dependencies. A plain `npm install` restored it. If the
  frontend build fails with "Cannot find native binding", run
  `npm install`.

## Going forward

Run `npm audit --omit=dev` in `backend/` before each deploy, and consider
enabling Dependabot or GitHub's security alerts for the repository.

## Verification

`npm audit` clean in both apps; backend `tsc` build and frontend
`tsc -b && vite build` both pass.
