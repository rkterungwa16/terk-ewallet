# 03. Time out every Paystack call; leave unknown-outcome withdrawals pending

- **Status:** shipped in [PR #9](https://github.com/rkterungwa16/terk-ewallet/pull/9) (commit `4b3c392`)
- **Code:** `src/services/paystack.service.ts`, `src/services/wallet.service.ts`
  (`withdraw`), `src/config/env.ts`, `src/utils/httpStatus.ts`

## Context

`paystackRequest()` called `fetch()` with no timeout. If Paystack was slow or
unreachable, the request waited until the platform proxy cut it off, holding
a connection and the customer's request the whole time. Under load these
pile up. It's also a plausible cause of some of the 502s seen on Railway.

Adding a timeout turned up a **money bug**. `withdraw()` refunded the
customer on *any* error from `initiateTransfer`. With a timeout, "Paystack
didn't answer in time" becomes an error, but Paystack may already have
accepted the transfer. Refunding then pays the customer twice: once by bank
transfer and once by refund.

## Decision

- Every Paystack request gets one deadline,
  `AbortSignal.timeout(PAYSTACK_TIMEOUT_MS)` (default 10s). It covers
  connecting, waiting for headers and reading the body.
- When no usable answer comes back, it throws a new
  **`PaystackUnavailableError`** (a subclass of `ApiError`). That covers:
  - a timeout, which becomes 504;
  - a connection failure, which becomes 502;
  - a reply that can't be parsed, which becomes 502.

  This is kept separate from an `ApiError` for an explicit rejection by
  Paystack. The difference means *the outcome is unknown*.
- `withdraw()` reacts differently to the two:
  - **Paystack rejected the transfer** (an explicit error response): refund
    immediately and mark it `failed`, as before.
  - **`PaystackUnavailableError`**: don't refund. The withdrawal stays
    `pending`, with the wallet debited, and the response returns it as
    pending. The `transfer.*` webhook settles it later. The frontend already
    shows "Withdrawal requested." for this case.

## Alternatives considered

- **Retrying the transfer on timeout.** Rejected. Without certainty that the
  first request didn't land, a retry risks a second payout. Paystack treats
  a reused `reference` as the same transfer, but relying on that wasn't
  needed.
- **Refunding on timeout and reversing later if a success webhook arrives.**
  Rejected. The money may already have left Paystack, and clawing back a
  wallet credit the customer may have spent is far worse than a delayed
  refund.
- **A longer default timeout.** Ten seconds is long for an interactive
  request but leaves room for Paystack's slower endpoints. It's configurable.

## Consequences

- **A gap, closed by record 04.** If Paystack never received the transfer
  request, no webhook ever comes, so the withdrawal would stay pending, and
  the customer's money debited, forever. The reconciler fixes this.
- Deposit verification benefits too. A timeout during `verifyTransaction` is
  thrown before the deposit is marked failed, so a slow Paystack can't
  wrongly fail a deposit.
- Customers see 504/502 with a clear message instead of a hang.

## Configuration

`PAYSTACK_TIMEOUT_MS` (default `10000`).

## Verification

Local MongoDB, a fake `fetch`, and a 300ms timeout:

| Case | Result |
|---|---|
| Paystack hangs | 504 after 303ms |
| Network error | 502 |
| Withdraw, timeout | Pending, debited, **not** refunded |
| Withdraw, network error | Pending, debited, **not** refunded |
| Withdraw, Paystack rejects | 400, `failed`, refunded |
| Withdraw, accepted | Pending, debited |

The test process needed a keep-alive interval, because
`AbortSignal.timeout`'s timer doesn't keep Node running. In the real server
the open socket does.
