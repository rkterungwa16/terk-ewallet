# Paystack Wallet API

An Express + TypeScript + MongoDB customer-wallet API, modeled on the
provided `ewallet-api` example, with the simulated card gateway replaced by
real [Paystack](https://paystack.com) integration for funding and payouts.

## Design choices vs. the reference project

The reference project pulls in a couple dozen npm packages (Joi, lodash,
moment, passport, bcryptjs, uuid, http-status, express-validation, dotenv,
bluebird, morgan, helmet, cors, method-override, mongoose-auto-increment...).
This version keeps the same layered architecture
(`config → models → services → controllers → routes → middlewares →
validations`) but only depends on **Express**, **Mongoose**, and
**TypeScript** at runtime/build time. Everything else is done with native
Node/JS APIs:

| Reference used | This project uses instead |
|---|---|
| `jsonwebtoken` / `passport-jwt` | Hand-rolled HS256 JWT sign/verify with `node:crypto` (`src/utils/jwt.ts`) |
| `bcryptjs` | `crypto.scrypt` password hashing (`src/utils/password.ts`) |
| `joi` / `express-validation` | A ~100-line field-check validator (`src/validations/validate.ts`) |
| `http-status` | A plain constants object (`src/utils/httpStatus.ts`) |
| `uuid` | `crypto.randomUUID()` |
| `mongoose-auto-increment` | A tiny `$inc`-based counter collection (`src/models/counter.model.ts`) |
| `dotenv-safe` | Node's native `--env-file` flag (Node 20.6+) |
| `axios` / `request` for the gateway | Native `fetch` (`src/services/paystack.service.ts`) |
| `morgan`, `helmet`, `cors`, `compression`, `method-override`, `bluebird` | Dropped, or a two-line replacement where actually needed |

One functional difference worth calling out: balances and transaction
amounts are stored as **integer kobo**, not floating-point naira. The
reference project stores `balance` as a `Number` in naira and leans on
`toFixed(2)`, which is exactly the kind of thing that produces off-by-a-kobo
bugs at scale. Paystack's own API already speaks in kobo, so this project
just stays in that unit end-to-end and only converts to naira at the HTTP
boundary (`src/utils/money.ts`).

## Requirements

- Node.js 20.6+ (for native `--env-file` support)
- MongoDB (local or Atlas)
- A Paystack account with test API keys — https://dashboard.paystack.com/#/settings/developers

## Setup

```bash
npm install
cp .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY

npm run build
npm start
```

For local development with auto-rebuild/restart, run these in two terminals:

```bash
npm run dev:build   # tsc --watch
npm run dev          # node --watch --env-file=.env dist/index.js
```

### Exposing your webhook locally

Paystack needs to reach `POST /v1/webhooks/paystack` over the public
internet. While developing locally, tunnel it (e.g. with `ngrok http 4000`)
and set that tunnel URL + `/v1/webhooks/paystack` as your webhook URL in the
Paystack dashboard under Settings → API Keys & Webhooks.

## Auth

All wallet/customer routes require `Authorization: Bearer <accessToken>`,
obtained from register/login.

```
POST /v1/auth/register   { email, password, name? }
POST /v1/auth/login      { email, password }
GET  /v1/customers/me
```

## Wallet endpoints

```
GET  /v1/wallet/balance
GET  /v1/wallet/transactions?page=&perPage=

POST /v1/wallet/fund/initialize        { amount }        -> { authorizationUrl, reference }
GET  /v1/wallet/fund/verify/:reference                    -> confirms + credits (idempotent)

POST /v1/wallet/transfer               { destinationAccountNumber, amount }  -> instant, no Paystack call

GET  /v1/wallet/banks                                     -> Paystack bank list, for a bank picker
POST /v1/wallet/bank-accounts          { accountNumber, bankCode } -> resolves + saves a payout recipient
POST /v1/wallet/withdraw               { amount, bankAccountId }   -> payout via Paystack Transfer
```

`amount` is always in naira (e.g. `500.00`); the API converts to/from kobo
internally.

## Funding flow

1. `POST /v1/wallet/fund/initialize` with an amount → returns Paystack's
   `authorizationUrl`. Redirect the customer there (or use it with
   Paystack's inline/popup JS on the frontend) to collect card details.
2. Paystack redirects back to `PAYSTACK_CALLBACK_URL` after payment. At that
   point, either:
   - the frontend calls `GET /v1/wallet/fund/verify/:reference` itself, or
   - you just wait for the `charge.success` webhook to land.

   Both paths call the same `confirmFunding` logic, guarded by a unique
   index on the processed-events collection, so the wallet is credited
   exactly once no matter which one wins the race.

## Withdrawal flow

1. `POST /v1/wallet/bank-accounts` with a Nigerian account number + Paystack
   bank code — this resolves the account name via Paystack and registers a
   transfer recipient.
2. `POST /v1/wallet/withdraw` with an amount and the saved `bankAccountId`.
   The wallet is debited immediately (so the funds can't be double-spent
   while the transfer is in flight) and a transfer is requested from
   Paystack. If Paystack rejects the request outright, the debit is reversed
   right away.
3. Paystack transfers are asynchronous — `transfer.success` finalizes the
   already-debited transaction, while `transfer.failed` / `transfer.reversed`
   refund the customer automatically via the webhook handler.

## Project layout

```
src/
  config/        env loading, Mongo connection, Express app wiring
  models/        Customer (wallet + bank accounts), Transaction (ledger), PaystackEvent (webhook idempotency), Counter
  services/      paystack.service (raw API calls), wallet.service (business logic), auth.service
  controllers/   thin HTTP-layer glue over the services
  routes/        route definitions per resource
  middlewares/   JWT auth, 404, error handling
  validations/   request body/query/param checks
  utils/         ApiError, asyncHandler, jwt, password hashing, money (kobo<->naira)
```

## Notes / things to harden before production

- The webhook handler currently logs and swallows failures from
  `confirmFunding` so Paystack doesn't retry forever on a payment that
  genuinely failed — make sure you have real logging/alerting on that path.
- `internalTransfer` and the debit/credit helpers use atomic single-document
  `findOneAndUpdate`s rather than a multi-document Mongo transaction, so they
  work against a standalone `mongod` (no replica set required). If you run a
  replica set/Atlas in production, wrapping the sender-debit +
  receiver-credit + two transaction inserts in a session transaction would
  give you stronger all-or-nothing guarantees.
- There's no rate limiting, request logging framework, or admin/reporting
  surface — this is deliberately just the wallet core.
