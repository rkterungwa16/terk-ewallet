# 09. Only let customers verify their own deposits (security)

- **Status:** shipped in [PR #14](https://github.com/rkterungwa16/terk-ewallet/pull/14) (commit `78f6bac`)
- **Code:** `src/services/wallet.service.ts` (`FundingConfirmer`,
  `confirmFunding`), `src/controllers/wallet.controller.ts`,
  `src/controllers/webhook.controller.ts`

This isn't a performance decision. It was found in the audit and fixed in
the same function as record 08, so it's recorded here alongside it.

## Context

`GET /v1/wallet/fund/verify/:reference` looked up the deposit **by
reference alone**. Any logged-in customer with another customer's reference
could:

- trigger confirmation of that deposit (the money still went to the right
  wallet), and
- read the owner's profile in the response: email, balance and saved bank
  accounts.

## Decision

`confirmFunding` now takes a **required** second argument saying who is
confirming:

```ts
type FundingConfirmer =
  | { customerId: string }               // the verify endpoint
  | { signedCharge: PaystackVerifyData } // the Paystack webhook
```

- `{ customerId }` adds `customer: customerId` to the lookup, so customers
  only find their own deposits.
- `{ signedCharge }` may confirm any deposit, because the webhook doesn't
  act for a particular customer and its payload is signed.
- Someone else's reference gets **the same 404 as an unknown one**, so the
  endpoint can't be used to check whether a reference exists.
- Because the argument is a required union rather than optional, a new
  caller can't skip the check by leaving it out. The compiler refuses.

## Alternatives considered

- **Checking ownership in the controller after loading.** That works, but
  it's easy to forget in a future caller, and a different status code would
  reveal that the reference exists.
- **Returning 403 for someone else's reference.** Rejected for the same
  reason: it reveals existence.

## Consequences

- No response change for owners.
- Before this fix, the endpoint could have been used to read other
  customers' details. If the deployed app had users other than the
  maintainer, the access logs may be worth checking for verify requests on
  references the caller didn't own.

## Verification

Two customers, over HTTP:

| Case | Result |
|---|---|
| Another customer checks the owner's pending deposit | 404, 0 Paystack calls, deposit untouched, no owner data in the body |
| Same request, unknown reference | Identical response |
| The owner checks it | 200, credited |
| Another customer checks the settled deposit | 404 (previously returned the owner's profile) |
| The owner checks it again | 200 |
| Webhook | Still credits any deposit |
| The other customer's balance | Unchanged |
