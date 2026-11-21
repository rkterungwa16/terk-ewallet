# 12. Rate-limit auth; enlarge the libuv threadpool

- **Status:** shipped in [PR #17](https://github.com/rkterungwa16/terk-ewallet/pull/17) (commit `2265c2b`)
- **Code:** `src/config/threadpool.ts`, `src/index.ts` (first import),
  `src/middlewares/rateLimit.middleware.ts`, `src/routes/v1/auth.route.ts`,
  `src/config/express.ts` (`trust proxy`), `src/config/env.ts`

## Context

Login and registration hash passwords with `crypto.scrypt`, which is slow
on purpose. Node runs scrypt on libuv's threadpool, which has **4 threads by
default**. The same pool serves `dns.lookup`, which every `fetch()` to
Paystack uses. A burst of logins could fill all 4 threads and queue Paystack
calls behind password hashing. There was also no limit on auth requests, so
a flood or password guessing could cause that burst on purpose.

## Decision

### Threadpool

`src/config/threadpool.ts` sets `process.env.UV_THREADPOOL_SIZE ??= '16'`.
It must be the **first import** in `index.ts`. The pool is created on first
use, so setting the size before anything uses it takes effect. A value set
in the real environment wins.

### Rate limits

These are in-memory fixed windows, with no dependency, in
`rateLimit.middleware.ts`:

| Limit | Applies to | Key | Default | Counts |
|---|---|---|---|---|
| `rateLimitByIp` | all `/v1/auth/*` | `req.ip` | 20 per minute | every request |
| `limitLoginFailures` | `POST /v1/auth/login` | email, trimmed and lower-cased | 10 per 15 minutes | **only 401s**; a success resets it |

Both return **429** with `Retry-After`. Expired windows are swept on an
unref'd timer, so the maps can't grow without bound.

**Why two limits.** The per-email limit is what actually stops password
guessing. It works across any number of IPs and doesn't depend on proxy
configuration. The per-IP limit caps floods, including registration floods
with random emails, which the per-email limit can't see.

### Client IP behind the proxy

`app.set('trust proxy', TRUST_PROXY)`, where `TRUST_PROXY` is the number of
proxy hops (default 0).

- With `0`, `req.ip` is the socket address. On Railway that's the proxy, so
  **every user would share one bucket**, and a busy minute would lock out
  all logins.
- With `1`, Express takes the client IP that Railway's proxy appends to
  `X-Forwarded-For` and ignores anything the client put in that header
  itself.
- Setting it **higher than the real number of hops** lets clients forge
  their IP. That's why it isn't simply `true`.

## Alternatives considered

- **express-rate-limit or Redis-backed limits.** These are more complete,
  but they add a dependency or infrastructure. In-memory limits are enough
  to slow guessing and floods on a single instance.
- **Counting all logins per email.** Rejected: a customer who mistypes a few
  times would be locked out even after succeeding. Counting only failures,
  and resetting on success, never affects normal use.
- **Lowering scrypt's cost.** Rejected: it weakens password storage to save
  CPU.
- **A larger threadpool alone.** It helps (see below) but can't beat CPU
  contention. Only the limits bound the work.

## Consequences

- **Set `TRUST_PROXY=1` on Railway.** This is the most important deployment
  step in the audit, because the default is wrong behind a proxy. Railway is
  believed to be one hop, but this hasn't been confirmed against
  production.
- Limits are per process. With N instances, the effective limit is about N
  times the setting.
- The limits reset on restart.

## Configuration

`TRUST_PROXY` (default `0`; **`1` on Railway**), `AUTH_RATE_LIMIT_PER_MINUTE`
(default `20`), `LOGIN_FAILURES_PER_15_MIN` (default `10`),
`UV_THREADPOOL_SIZE` (default `16` from code).

## Verification

**Threadpool**, on an 8-core machine: 12 concurrent password hashes with one
DNS lookup queued behind them.

| Pool size | Hashes done | DNS lookup waited |
|---|---|---|
| 4 (default) | 114ms | 111ms |
| 16 | 81ms | 68ms |
| 6 (set in the environment, overrides the code) | 93ms | 82ms |

The rest of the DNS wait is CPU contention (12 CPU-bound threads on 8
cores), which threads can't remove.

**Rate limits**, over HTTP:

| Case | Result |
|---|---|
| 10 failed logins for one email across 10 IPs | 11th refused even with the right password: 429, `Retry-After: 900` |
| Upper-case variant of that email | Also 429 (no bypass) |
| A different email | Unaffected |
| 9 failures, a success, then 9 more | Never locked |
| 22 registrations from one real IP, forged `X-Forwarded-For` prefix rotating | First 20 allowed, then 429 |
| A different client IP | Unaffected |
| `TRUST_PROXY=0` with a different `X-Forwarded-For` each time | Header ignored, limited by socket address |
| Non-auth routes | Unaffected |
