# 08. Skip Paystack when re-verifying settled deposits

- **Status:** shipped in [PR #14](https://github.com/rkterungwa16/terk-ewallet/pull/14) (commit `602b526`)
- **Code:** `src/services/wallet.service.ts` (`confirmFunding`,
  `publicCustomerById`), `src/services/paystack.service.ts`
  (`PaystackVerifyData.status`)

## Context

`GET /v1/wallet/fund/verify/:reference` is called by the payment callback
page. A successful deposit was already answered from the database, but a
**failed** one called Paystack again on every visit, even though a failed
charge can't succeed later.

The win here is modest. The callback page verifies once each time it loads,
not in a loop, so repeat calls come from refreshes, revisits and React's
double-run of effects in development.

The real finding was a **correctness bug** that the shortcut would have made
worse. Any status other than `success` marked the deposit `failed`, including
`abandoned` (checkout not finished) and in-progress statuses. A customer who
verified too early and then completed payment would be marked failed. With
"failed means skip Paystack", they could then never be credited by polling.

## Decision

- **Answer settled deposits from the database.** `success` was already
  handled. `failed` now returns 402 without calling Paystack.
- **The signed webhook can still credit a failed deposit.** The shortcut
  applies only when there's no `signedCharge`, because a signed
  `charge.success` is Paystack itself reporting success.
- **Only final statuses mark a deposit failed:** `failed` and `reversed`.
  `abandoned`, `ongoing`, `pending`, `processing` and `queued` return 402
  but leave the deposit `pending`, with no database write. The
  `PaystackVerifyData.status` type now lists all of them.
- **Lighter reads on the settled and already-processed paths.** The customer
  is read lean without the hash (`publicCustomerById`), and in the
  already-processed path the transaction and customer are read at the same
  time with `Promise.all`.

## Alternatives considered

- **Cache verify results in memory.** Not needed once settled states are
  answered from the database, which is the source of truth anyway.
- **Have the frontend stop calling verify once settled.** That's helpful,
  but the server shouldn't rely on client behavior for its Paystack usage.

## Consequences

- At most one Paystack call per deposit reaches a final state through
  polling.
- Customers who abandon and later complete checkout are credited correctly.
- Responses are unchanged, because they use the shared serializers from
  records 01 and 06.

## Verification

| Case | Result |
|---|---|
| Success, checked 4 times | 1 Paystack call, identical bodies, no `passwordHash` |
| `abandoned` | 402, left pending |
| …then the customer pays | Next check: 200, credited |
| `ongoing` / `pending` / `processing` / `queued` | All left pending |
| `failed`, checked 3 times | 402 each time, 1 Paystack call |
| `reversed` | Marked failed |
| Signed webhook for a failed deposit | Credited, 0 Paystack calls |
| Already-processed path | Correct transaction and customer |
| Unknown reference | 404 |
