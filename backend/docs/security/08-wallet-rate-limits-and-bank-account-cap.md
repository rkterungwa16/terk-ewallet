# 08. Rate-limit wallet writes; cap saved bank accounts

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/middlewares/rateLimit.middleware.ts` (`rateLimitBy`,
  `rateLimitByCustomer`), `src/routes/v1/wallet.route.ts`,
  `src/services/wallet.service.ts` (`addBankAccount`, `MAX_BANK_ACCOUNTS`)

## Context

Only `/v1/auth/*` was rate-limited. Any logged-in customer could call the
wallet endpoints as fast as they liked, and registering is free. Three of
them are worth abusing:

- **`POST /wallet/bank-accounts` was a name-lookup service.** It calls
  Paystack's `/bank/resolve`, which returns the **account holder's name**
  for any account number and bank, then saves the result. A script could
  resolve thousands of Nigerian bank accounts to names, using our Paystack
  key and quota, and get our key rate-limited or flagged in the process.
  Every call also created a Paystack transfer recipient and `$push`ed onto
  the customer document, which had no size limit (MongoDB documents max out
  at 16 MB).
- **`POST /wallet/fund/initialize`** creates a Paystack transaction and a
  pending ledger row on every call, so a loop fills the ledger and
  Paystack's dashboard with junk.
- **`POST /wallet/transfer`** answers 404 "Destination account not found"
  before checking the balance, so with an empty wallet it tells you
  whether an account number exists. Account numbers are sequential from
  1001, so they're easy to walk.

## Decision

### Per-customer limits

`rateLimitByCustomer(limit, windowMs)` keys on the authenticated
customer's id (falling back to IP). It's built on the same in-memory
fixed-window counter as the auth limits, now shared through a generic
`rateLimitBy(keyOf, ...)`.

| Endpoint | Limit |
|---|---|
| `POST /fund/initialize`, `GET /fund/verify/:reference`, `POST /transfer`, `POST /withdraw` | 20 per minute per customer (shared) |
| `POST /bank-accounts` | 5 per hour per customer |

Read-only endpoints (`/balance`, `/transactions`, `/banks`) aren't limited:
they're cheap and the frontend polls some of them.

Keying on the customer rather than the IP means one customer can't
affect another, even behind a shared network address, and it doesn't
depend on `TRUST_PROXY` being right.

### Bank account cap

`addBankAccount` now, **before calling Paystack**:

- Refuses an account number and bank code pair that's already saved (409).
- Refuses once 10 accounts are saved (422).

The final write re-checks both atomically in the update filter, so two
concurrent saves can't slip past the checks:

```ts
Customer.findOneAndUpdate({
  _id: customer._id,
  'bankAccounts.9': { $exists: false },                       // fewer than 10
  bankAccounts: { $not: { $elemMatch: { accountNumber, bankCode } } },
}, { $push: { bankAccounts: ... } })
```

## Alternatives considered

- **Global limits per endpoint.** One abuser would lock out everyone.
- **Caching `/bank/resolve` results.** Reduces Paystack calls but doesn't
  stop the lookup abuse, which is the real problem.
- **Checking the balance before the destination lookup in transfers.**
  Would hide whether an account exists from empty wallets, but changes the
  error a real customer sees. The rate limit bounds enumeration to 20
  guesses a minute per account, which, with free registration, slows but
  doesn't stop a determined attacker (see README "Not done yet").

## Consequences

- Limits are in memory, per process, and reset on restart, like the auth
  limits. With several instances each enforces its own.
- 20 a minute is far above what a person does; the fund callback page
  calls `/fund/verify` once per visit.
- A customer who hits the 10-account cap must remove one first. There is
  **no delete endpoint yet**, so for now that needs a database change.
