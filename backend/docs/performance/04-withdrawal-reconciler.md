# 04. Reconcile withdrawals stuck in pending against Paystack

- **Status:** shipped in [PR #10](https://github.com/rkterungwa16/terk-ewallet/pull/10) (commit `ae850e9`)
- **Code:** `src/services/reconcile.service.ts`,
  `src/services/paystack.service.ts` (`verifyTransfer`),
  `src/services/wallet.service.ts` (`resolveWithdrawal`),
  `src/models/transaction.model.ts` (partial index), `src/index.ts`

## Context

Record 03 leaves a withdrawal `pending` when Paystack doesn't answer the
transfer request, because the transfer may have gone through. Normally a
`transfer.success`, `transfer.failed` or `transfer.reversed` webhook settles
it. But if Paystack **never received** the request, or the webhook was lost,
nothing ever settles it, and the customer's money stays debited.

## Decision

Run a reconciler inside the server process:

- Every `RECONCILE_INTERVAL_MS` (default 5 minutes; `0` disables it), it
  finds withdrawals pending longer than `RECONCILE_MIN_AGE_MS` (default
  15 minutes). That gives the webhook time to arrive first.
- It works oldest first, in batches of 10, using `_id` as a cursor. Each
  withdrawal is checked with `GET /transfer/verify/:reference`, and the
  outcome is mapped like this:

  | Paystack says | Action |
  |---|---|
  | `success` | Settle as success |
  | `failed` / `reversed` | Settle as failed and refund |
  | Transfer not found (404) | Paystack never got it: refund and mark failed |
  | Anything else (pending, otp, ...) | Leave for a later run or the webhook |

- Lookups in a batch run with `Promise.allSettled`, so one failure doesn't
  stop the rest. The run returns a summary of outcomes, which is logged.
- Runs never overlap. A tick that fires while the previous run is still
  going is skipped.
- A **partial index**
  `{ operation: 1, status: 1, _id: 1 }` with
  `partialFilterExpression: { operation: 'withdrawal', status: 'pending' }`
  holds only the few pending withdrawals, not the whole ledger, so the scan
  stays cheap however large the ledger grows.

**Concurrency fix that came with it.** The webhook and the reconciler can
now settle the same withdrawal at the same moment. Before, `resolveWithdrawal`
read the status and then wrote it in separate steps, so both callers could
see `pending` and both could refund. Now the pending-to-final change is a
single conditional `findOneAndUpdate({ reference, status: 'pending' })`. Only
the caller whose update matched issues the refund, and the function returns
whether this call did the settling.

## Alternatives considered

- **A cron library or an external scheduler** (Railway cron, a queue).
  Rejected for now because the project avoids dependencies, and a
  `setInterval` in the API process is enough at this scale. With more than
  one instance, each runs the reconciler. That's safe because of the
  conditional update, but it repeats the Paystack lookups.
- **Refunding pending withdrawals after a fixed age without asking
  Paystack.** Rejected, because it pays twice if the transfer did go through.

## Consequences

- No withdrawal can stay pending forever, as long as the process runs.
- Settlement may come from the webhook or the reconciler, whichever is first.
  The other becomes a no-op.
- Shutdown waits for a run that's already in progress (added in record 10),
  and with record 11 each settlement is one atomic transaction.

## Configuration

`RECONCILE_INTERVAL_MS` (default `300000`, `0` disables),
`RECONCILE_MIN_AGE_MS` (default `900000`).

## Verification

Tested by the session that built it, against local MongoDB with a fake
`fetch`. It covered the success, failed, not-found and still-pending cases,
and showed that two settlements of the same withdrawal at once refund only
once. Record 11 re-verified the refund-once behavior (3 concurrent
settlements, 1 refund) and that a crash before the refund rolls the status
back.
