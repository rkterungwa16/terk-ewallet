# 02. Log status and duration for every request

- **Status:** shipped in [PR #8](https://github.com/rkterungwa16/terk-ewallet/pull/8) (commit `0f077d0`)
- **Code:** `src/middlewares/requestLog.middleware.ts`, mounted first in
  `src/config/express.ts`

## Context

The only request log was written when a request *arrived*, showing just the
method and URL. It recorded nothing about outcome or latency, so there was
no way to tell whether any later change made things faster, or which routes
were slow in production. It also ran after CORS and the webhook route, so
preflight requests and webhooks weren't logged at all.

## Decision

Replace it with a `requestLog` middleware that writes one line when the
response finishes:

```
2026-11-21T21:50:00.000Z GET /v1/wallet/transactions 200 12.3ms
```

- Timing uses `process.hrtime.bigint()`, a monotonic clock that isn't
  affected by changes to the system clock.
- It listens for `finish` (response sent) and `close` (connection gone). If
  the connection closes before the response is sent, the line says
  `aborted` instead of a status. A `logged` flag makes sure each request
  gets exactly one line.
- It's mounted first, so every request is timed, webhooks and CORS
  preflights included.

## Alternatives considered

- **morgan.** It does the same job, but the codebase deliberately avoids
  dependencies for small things (it has its own JWT and validation helpers),
  and this is about 20 lines.
- **Structured JSON logs.** Better for log search, but a format change
  belongs with a decision about a log pipeline, which doesn't exist yet. The
  line format stays human-readable and easy to grep.
- **Logging the client IP or user ID.** Left out: it adds personal data to
  logs without a current need.

## Consequences

- Log volume is about the same: still one line per request, now with more
  information.
- Health checks to `/v1/status` appear with timings, as before.
- The `aborted` status shows requests the client gave up on, typically
  because an upstream call (Paystack) was slow. This was the baseline for
  record 03.

## Verification

Against the real app, one request each that returned 200, 204 (preflight),
404 and 401, a 401 on the webhook, and a client that sent half a body and
hung up. Each produced exactly one line with the right status. The hang-up
logged `POST /v1/webhooks/paystack aborted 51.2ms`.
