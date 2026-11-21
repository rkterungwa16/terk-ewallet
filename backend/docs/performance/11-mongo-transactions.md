# 11. Make money movements atomic with MongoDB transactions

- **Status:** shipped in [PR #16](https://github.com/rkterungwa16/terk-ewallet/pull/16) (commit `9117293`)
- **Code:** `src/config/transactions.ts`, `src/config/db.ts`,
  `src/services/wallet.service.ts`

## Context

Each money movement was a sequence of separate writes. Each write was atomic
on its own (`$inc` updates, conditional debits), but **the sequence was
not**. A crash, deploy or error between two steps left balances and the
ledger out of step:

| Flow | Steps | A crash between them leaves... |
|---|---|---|
| Internal transfer | debit, ledger row, credit, ledger row | money out of one wallet and never into the other |
| Withdraw | debit, pending ledger row | a debit with no ledger entry (invisible to the reconciler) |
| Withdraw rejected | refund, mark failed | a refund with the withdrawal still pending, or the reverse |
| Deposit | idempotency marker, credit, ledger update | **marker written, never credited, and every retry blocked by the marker** |
| Settle withdrawal | mark failed, refund | marked failed, money never returned |

This is mainly a correctness fix. It also saves a round trip in transfers,
because the two ledger rows are now written with one `insertMany`.

## Decision

**A helper, `withTransaction(fn)`**, in `src/config/transactions.ts`:

- At startup, `detectTransactionSupport()` runs `hello`. Transactions are
  supported on a replica set (`setName`) or a sharded cluster
  (`msg: 'isdbgrid'`).
- When they're supported, it uses `mongoose.connection.transaction(fn)`.
  That retries `fn` from the start on temporary errors, such as write
  conflicts between concurrent transactions, and resets document state on
  abort.
- On a **standalone** server, `fn(undefined)` simply runs: the previous,
  step-by-step behavior. The app logs a startup warning.

**Each flow above** runs in one transaction. Every call inside passes
`session`, and `create` uses its array form, which a session requires.

**Paystack calls are never inside a transaction.** Holding a transaction
open across a slow external call keeps documents locked and risks the
transaction timing out. A retry would also repeat the external call. So in
`withdraw`:

1. Transaction: debit plus pending ledger row. Commit.
2. Call Paystack.
3. If Paystack rejects: transaction: refund plus mark failed.

**The deposit's idempotency check still works.** The `PaystackEvent` insert
(unique on `reference`) is inside the transaction. A duplicate aborts the
transaction with error 11000, which is caught *outside* it and handled as
"already processed", as before.

## Why fall back instead of requiring a replica set

The production database type wasn't known when this was written. Atlas is
always a replica set. A plain `mongod`, which may be Railway's default Mongo
template, is not, and transactions fail there outright. Requiring them would
have broken every transfer on a standalone deployment. The fallback keeps
the app working there, and the log line makes the reduced guarantee
visible.

## Consequences

- **Check the startup log after deploying.** You should see
  `MongoDB supports transactions: money movements are atomic`. On a
  `WARNING: MongoDB is a standalone server...` line, none of this protection
  applies, and moving to a replica set turns it on with no code change.
- Functions passed to `withTransaction` may run more than once, so they must
  have no side effects outside the database.
- Transactions add a little latency per money movement. That's negligible
  next to the Paystack calls these flows already make.

## Verification

The same suite ran on a local **single-node replica set** and on a
**standalone** server. The tests deliberately made individual writes fail.

Replica set (all passed):

| Case | Result |
|---|---|
| Transaction support | Detected |
| 40 concurrent transfers in both directions | Total balance conserved, ledger sums match balances |
| Crash before the transfer's ledger rows | Fully rolled back |
| Crash writing a withdrawal's ledger row | Debit rolled back |
| Withdrawal rejected / accepted | Refunded and failed / pending and debited |
| 3 concurrent settlements of one withdrawal | 1 won, refunded once |
| Crash before a settlement's refund | Status rolled back to pending (retryable) |
| Crash right after a deposit's marker | Marker rolled back, retry credited |
| 4 concurrent confirmations of one deposit | Credited once |

On the standalone server, the same crashes reproduced the old failures: a
transfer half-moved with no ledger rows, a debit with no ledger row, a
withdrawal marked failed with no refund, and a deposit that could never be
credited. Those are the cases the replica set now prevents.
