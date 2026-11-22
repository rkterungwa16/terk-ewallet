# 12. Refuse webhooks without a reference

- **Severity:** Low
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/controllers/webhook.controller.ts`,
  `src/services/wallet.service.ts` (`confirmFunding`)

## Context

After verifying the signature, the Paystack webhook passed
`data.reference` straight into lookups:

```ts
Transaction.findOne({ reference, operation: 'deposit' })
```

If `reference` is `undefined`, **Mongoose drops that condition**, so the
query becomes `{ operation: 'deposit' }` and matches some arbitrary
customer's deposit. For `charge.success`, the signed payload's amount is
compared with that deposit, and on a match the deposit is credited.

This can only be triggered by a correctly signed payload, so in practice by
Paystack itself sending an event with no reference, or by someone who has
our secret key (who could do worse anyway). It's defense in depth, not an
open hole. But the failure mode, crediting the wrong customer, is bad
enough to guard against.

The handler also called `JSON.parse` on the body without a `try`, so a
signed but malformed body caused a 500 and Paystack retries.

## Decision

- The webhook parses the body inside a `try` and answers **400** to invalid
  JSON.
- If `data.reference` isn't a non-empty string, it answers **200 and does
  nothing**. 200 because no retry will ever add a reference, and every
  event we handle needs one.
- `confirmFunding` checks the same thing at the top and throws 404, so no
  future caller can hit the empty-filter case either.

`resolveWithdrawal` (transfer events) is covered by the webhook check, and
the reconciler only passes references read from our own ledger.

## Rule for new code

Never pass a value that might be `undefined` into a Mongoose filter. Check
it first, because Mongoose silently widens the query instead of matching
nothing.

## Verification

Against the built app: an unsigned webhook gets 401; a correctly signed
`charge.success` with `data: {}` gets 200 and touches nothing.
