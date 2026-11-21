# Backend performance decisions

This folder records each performance decision made in the November 2026
audit of the backend: what the problem was, what was decided and why, the
alternatives that were rejected, the trade-offs accepted, and how the change
was verified. Read a record before changing the code it covers.

The audit was done by reading the code, not by profiling production. The
measurements in these records come from local runs against MongoDB with a
fake Paystack. Request timing in the logs (record 02) exists to check them
against real traffic.

## Records

| # | Decision | Area | PR |
|---|---|---|---|
| [01](01-transaction-history-index.md) | Index the transaction history query and bound its pagination | MongoDB, API | [#7](https://github.com/rkterungwa16/terk-ewallet/pull/7) |
| [02](02-request-timing-log.md) | Log status and duration for every request | Observability | [#8](https://github.com/rkterungwa16/terk-ewallet/pull/8) |
| [03](03-paystack-timeouts.md) | Time out every Paystack call; leave unknown-outcome withdrawals pending | Paystack, money | [#9](https://github.com/rkterungwa16/terk-ewallet/pull/9) |
| [04](04-withdrawal-reconciler.md) | Reconcile withdrawals stuck in pending against Paystack | Paystack, money | [#10](https://github.com/rkterungwa16/terk-ewallet/pull/10) |
| [05](05-bank-list-cache.md) | Cache the bank list; save bank accounts with an atomic `$push` | Paystack, MongoDB | [#11](https://github.com/rkterungwa16/terk-ewallet/pull/11) |
| [06](06-lean-auth-customer.md) | Load the authenticated customer lean, without the password hash | Auth, MongoDB | [#12](https://github.com/rkterungwa16/terk-ewallet/pull/12) |
| [07](07-webhook-signed-payload.md) | Settle `charge.success` webhooks from the signed payload | Webhooks, money | [#13](https://github.com/rkterungwa16/terk-ewallet/pull/13) |
| [08](08-verify-short-circuit.md) | Skip Paystack when re-verifying settled deposits | Paystack, money | [#14](https://github.com/rkterungwa16/terk-ewallet/pull/14) |
| [09](09-verify-ownership.md) | Only let customers verify their own deposits (security) | Security | [#14](https://github.com/rkterungwa16/terk-ewallet/pull/14) |
| [10](10-server-timeouts-and-shutdown.md) | Tune HTTP keep-alive; bound graceful shutdown | HTTP server | [#15](https://github.com/rkterungwa16/terk-ewallet/pull/15) |
| [11](11-mongo-transactions.md) | Make money movements atomic with MongoDB transactions | MongoDB, money | [#16](https://github.com/rkterungwa16/terk-ewallet/pull/16) |
| [12](12-auth-rate-limits-and-threadpool.md) | Rate-limit auth; enlarge the libuv threadpool | Auth, runtime | [#17](https://github.com/rkterungwa16/terk-ewallet/pull/17) |

Records 08 and 09 shipped together in PR #14. Record 09 is a security fix
found while working on 08. It's kept here because it changed the same code
path and the same function signature.

## Principles that came out of the audit

These held across several records, and new changes should follow them too.

- **Correctness of money beats speed.** Several speed-ups (03, 07, 08)
  initially carried a risk of paying a customer twice or never crediting
  them. In each case the design was changed so that it doesn't.
- **"No answer" is not "no".** When Paystack doesn't respond, the outcome is
  unknown, not failed. Don't refund or fail anything on a timeout. Leave it
  pending, and let a webhook or the reconciler settle it (03, 04).
- **Never hold a database transaction open across a Paystack call** (11).
- **Don't acknowledge a webhook you failed to process.** A 200 tells
  Paystack to stop retrying (07).
- **No new dependencies for small things.** Caching, rate limiting and
  request logging are each a few dozen lines, in keeping with the rest of
  the codebase.

## Settings introduced

All of these are optional, with the defaults shown. All except
`UV_THREADPOOL_SIZE` are also documented in `backend/.env.example`.
`UV_THREADPOOL_SIZE` is set in `src/config/threadpool.ts` unless the
environment already sets it.

| Variable | Default | Record |
|---|---|---|
| `PAYSTACK_TIMEOUT_MS` | `10000` | 03 |
| `RECONCILE_INTERVAL_MS` | `300000` (0 disables) | 04 |
| `RECONCILE_MIN_AGE_MS` | `900000` | 04 |
| `KEEP_ALIVE_TIMEOUT_MS` | `65000` | 10 |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | 10 |
| `TRUST_PROXY` | `0` (**set to `1` on Railway**) | 12 |
| `AUTH_RATE_LIMIT_PER_MINUTE` | `20` | 12 |
| `LOGIN_FAILURES_PER_15_MIN` | `10` | 12 |
| `UV_THREADPOOL_SIZE` | `16` (set in code unless already set) | 12 |

## Deployment checks

1. **`TRUST_PROXY=1` on Railway** (record 12). Otherwise every user shares
   one per-IP rate limit, keyed on the proxy's address.
2. **MongoDB is a replica set** (record 11). Look for
   `MongoDB supports transactions` in the startup log. A standalone server
   logs a warning, and money movements are then not atomic.
3. **Railway's shutdown grace period is longer than `SHUTDOWN_TIMEOUT_MS`**
   (record 10).
4. **Drop the old `customer_1` index** on `transactions` once record 01 is
   deployed. It's now redundant.

## Not done yet

- **Cursor pagination for transaction history.** `skip` still reads every
  row it skips. It's capped (record 01), but keyset pagination on
  `(createdAt, _id)` would make deep pages cheap.
- **A server-side dashboard summary.** The dashboard downloads the latest
  200 transactions to compute monthly totals in the browser (see
  `frontend/docs/design/patterns/data-integrity.md`). An aggregation endpoint
  would send a few numbers instead.
