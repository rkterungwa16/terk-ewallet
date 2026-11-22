# 11. Don't relay Paystack's auth and server errors to customers

- **Severity:** Low
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/services/paystack.service.ts` (`paystackRequest`)

## Context

When Paystack rejected a request, `paystackRequest` threw an `ApiError`
with **Paystack's own status and message**. Most of those are meaningful
to the customer (400 "Could not resolve account name"), but two kinds
aren't:

- **401/403** mean Paystack refused **our secret key**: a misconfiguration
  on our side. Relaying 401 to the browser made it look like the
  customer's session had failed, and the message described our
  credentials.
- **5xx** are Paystack outages, not anything the customer did.

## Decision

For a non-OK Paystack response:

| Paystack status | Client sees | Logged |
|---|---|---|
| 401, 403, or 5xx | 502 "Payment provider request failed" | Path (without query string), status and Paystack's message |
| Other 4xx | Paystack's message and status (unchanged) | No |
| 2xx with `status: false` | Paystack's message, 502 | No |

The path is logged without its query string because
`/bank/resolve?account_number=...` would otherwise put account numbers in
the logs.

## What didn't change

Money behavior is the same. Both before and after, these are ordinary
`ApiError`s (Paystack answered and refused), not
`PaystackUnavailableError` (no answer), so a refused withdrawal is still
refunded immediately (performance record 03). The reconciler's "transfer
not found" check still sees Paystack's 404.

## Consequences

A wrong `PAYSTACK_SECRET_KEY` now shows in the logs as
`Paystack /... -> 401`, and customers see a 502 instead of being bounced
to the login page.
