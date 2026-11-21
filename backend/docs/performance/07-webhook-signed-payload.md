# 07. Settle `charge.success` webhooks from the signed payload

- **Status:** shipped in [PR #13](https://github.com/rkterungwa16/terk-ewallet/pull/13) (commit `65774b7`)
- **Code:** `src/controllers/webhook.controller.ts`,
  `src/services/wallet.service.ts` (`confirmFunding`)

## Context

On `charge.success`, the handler called Paystack's
`/transaction/verify/:reference` before replying. A slow Paystack (up to the
10s timeout from record 03) delayed the reply, and Paystack retries
webhooks that aren't answered quickly, which adds more load.

Reading the handler also turned up a **reliability bug**. It wrapped
`confirmFunding` in `.catch(log)` and always replied 200. If the database
was down while crediting a deposit, the webhook was acknowledged, Paystack
stopped retrying, and the deposit was silently lost.

## Decision

**Use the payload instead of a verify call.** A webhook body is accepted
only after its HMAC-SHA512 signature (keyed with our Paystack secret) checks
out. For `charge.*` events, `data` is the same charge object that
`/transaction/verify` returns. So once the signature is valid, the payload
is as trustworthy as a verify response. `confirmFunding(reference,
{ signedCharge })` uses it directly. The webhook path now only touches the
database.

**Check what was paid.** Both paths (webhook and client polling) now credit
the wallet only if `amount` equals the pending deposit's `amountKobo` and
`currency` is `NGN`. Before, the amount was never checked. On a mismatch, the
deposit stays pending and the response is a 409.

**Acknowledge only what retrying can't change.** The handler replies 200 for:

| Outcome | Status | Why 200 is right |
|---|---|---|
| Unknown reference | 404 | Not ours, and retrying won't help |
| Charge not successful | 402 | Settled outcome |
| Amount or currency mismatch | 409 | Needs a person, not a retry |

Any other error (the database, unexpected failures) is rethrown, which
returns a 500, so **Paystack retries later**.

## Alternatives considered

- **Reply 200 at once and process in the background** (the original plan).
  Rejected: after a 200, Paystack never resends, so any failure during
  processing loses the deposit. Doing it safely would need a durable queue
  of received events plus a retry worker. Using the signed payload makes the
  processing fast enough that the ack can wait, with no new moving parts.
- **Keep the verify call** but rely on the timeout. That still delays the
  reply by up to 10s whenever Paystack is slow.

## Consequences

- The deposit webhook replies in tens of milliseconds, with no Paystack
  calls.
- The client polling endpoint (`/fund/verify`) still asks Paystack, since it
  has no signed payload.
- If Paystack ever reports an amount different from what we asked it to
  charge, those deposits stay pending, and a log line says why. Fees are
  billed separately, so this isn't expected.
- Transfer webhooks were already database-only and are unchanged.

## Verification

Signed webhooks sent to the real app. The fake Paystack took 300ms per call,
so any call would have shown in the timing:

| Case | Result |
|---|---|
| `charge.success` | 200 in 40ms, credited, **0 Paystack calls** |
| Replayed | Credited once |
| 2 concurrent deliveries | Credited once |
| Unknown reference | 200 |
| Amount mismatch / wrong currency | 200, left pending, not credited |
| Bad signature | 401 |
| Database error mid-processing | **500** (Paystack will retry) |
| Retry after recovery | 200, credited |
| Unhandled event type | 200 |
| Polling endpoint | 1 Paystack call, success |
| Polling, amount mismatch | 409 |
