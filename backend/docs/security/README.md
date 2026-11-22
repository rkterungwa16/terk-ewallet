# Security decisions

This folder records each fix from the November 2026 security audit of the
backend and frontend: what the problem was, how it could be abused, what
was decided and why, the alternatives that were rejected, and how the fix
was checked. Read a record before changing the code it covers.

The audit was done by reading the code, running `npm audit`, and testing
the built API over HTTP with no database. Measurements come from local runs.
The money flows (transfers, withdrawals, deposits) were **not** re-tested
against MongoDB and Paystack test mode as part of this work.

Record 09 in [`../performance`](../performance/README.md) (customers can
only verify their own deposits) is an earlier security fix and still
applies.

## Records

All shipped together on branch `security/audit-fixes` (commit `3d3bdc6`).

| # | Fix | Severity | Area |
|---|---|---|---|
| [01](01-email-regex-redos.md) | Cap email length before the regex (unauthenticated ReDoS) | High | Validation, availability |
| [02](02-dependency-vulnerabilities.md) | Patch vulnerable dependencies (`proxy-addr` critical) | High | Dependencies |
| [03](03-fail-safe-node-env.md) | Treat a missing `NODE_ENV` as production | High | Configuration |
| [04](04-internal-error-messages.md) | Stop sending internal error details to clients | High | Error handling |
| [05](05-jwt-secret-strength.md) | Refuse weak `JWT_SECRET` values in production | Medium | Auth, configuration |
| [06](06-jwt-verification.md) | Stricter token verification | Medium | Auth |
| [07](07-login-timing-enumeration.md) | Make login take the same time for unknown emails | Medium | Auth, privacy |
| [08](08-wallet-rate-limits-and-bank-account-cap.md) | Rate-limit wallet writes; cap saved bank accounts | Medium | Abuse, Paystack, privacy |
| [09](09-input-validation-and-body-parsing.md) | Stricter input validation; JSON-only bodies | Medium | Validation |
| [10](10-security-headers.md) | Security headers on the API and the frontend | Medium | HTTP, frontend |
| [11](11-paystack-error-mapping.md) | Don't relay Paystack's auth and server errors | Low | Paystack, error handling |
| [12](12-webhook-reference-guard.md) | Refuse webhooks without a reference | Low | Webhooks, money |
| [13](13-password-policy-and-checkout-redirect.md) | Password minimum of 8; only redirect to Paystack checkout | Low | Auth, frontend |

## Principles that came out of the audit

- **Fail closed.** A missing or unexpected setting should get the safe
  behavior, not the convenient one (03, 05).
- **Length-check before you regex.** Any pattern run on user input runs
  after a length cap (01).
- **Type-check every input, not just presence.** Anything that reaches a
  query or URL also gets a format check (09).
- **Only `ApiError` messages reach customers.** Everything else is a
  generic 500 and a log line (04, 11).
- **Never put a possibly-`undefined` value in a Mongoose filter.** Mongoose
  drops it and widens the query (12).
- **Anything that costs us money or reveals data gets a limit** (08).
- **No new dependencies for small things**, as in the performance audit.

## Deployment checks

1. **`JWT_SECRET` is at least 32 characters** on Railway, or the API won't
   start (record 05). Generate one with
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
2. **`connect-src` in `frontend/vercel.json` matches the API origin**
   (record 10). It's pinned to
   `https://terk-ewallet-production.up.railway.app`.
3. **After deploying the frontend**, open it and check the browser console
   for CSP violations (record 10).
4. **Node 20.19+** wherever the frontend is built (record 02).
5. **`NODE_ENV`** can stay unset on Railway now (record 03), but set it to
   `production` anyway for clarity.
6. The performance audit's checks still apply, especially `TRUST_PROXY=1`.

## Not done yet

These need design changes beyond a fix, roughly in priority order.

- **Session token in `localStorage`.** Any script injected into the
  frontend can read it. The CSP (record 10) makes injection and
  exfiltration much harder, but the proper fix is an httpOnly cookie. With
  the frontend on Vercel and the API on Railway that needs a cross-site
  `SameSite=None; Secure` cookie (or a shared parent domain) plus CSRF
  protection.
- **No server-side logout or revocation.** A stolen token works until it
  expires (60 minutes). A `tokenVersion` on the customer, checked in
  `authenticate()`, would allow logout and "log out everywhere".
- **Standalone MongoDB in production.** Money movements aren't atomic
  without a replica set (performance record 11). Consider refusing to start
  in production instead of only logging a warning.
- **Login lockout can be abused.** The per-email failure limit
  (performance record 12) lets anyone lock a customer out for 15 minutes by
  failing on purpose. A CAPTCHA after a few failures, or keying the limit on
  email and IP together, would reduce that.
- **Account enumeration.** Registration's 409 reveals registered emails,
  and transfers reveal which account numbers exist (record 08). Both are
  now rate-limited, but still answer the question.
- **Rate limits are per process.** With more than one instance, move them
  to Redis.
- **Webhook source.** As extra defense, accept webhooks only from
  Paystack's published IP addresses.
- **No way to delete a saved bank account.** Needed now that there's a cap
  of 10 (record 08).
- **No password change**, so the new minimum (record 13) can't be applied
  to existing accounts.
