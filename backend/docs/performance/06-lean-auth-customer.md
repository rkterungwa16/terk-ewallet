# 06. Load the authenticated customer lean, without the password hash

- **Status:** shipped in [PR #12](https://github.com/rkterungwa16/terk-ewallet/pull/12) (commit `7ce3b39`)
- **Code:** `src/middlewares/auth.middleware.ts`, `src/models/customer.model.ts`
  (`AuthCustomer`, `toPublicCustomer`), `src/types/express/index.d.ts`,
  `src/controllers/customer.controller.ts`, `src/services/wallet.service.ts`

## Context

`authenticate()` runs on every protected request. It loaded the customer
with `Customer.findById(id)`, which builds a full Mongoose document,
including `passwordHash` and every saved bank account, and put it on
`req.customer`. Most handlers only read `_id`, `email` or `accountNumber`.

Two costs came with that: building the document on every request, and
carrying the password hash through every request handler, where it can't
leak only because no handler happens to serialize it.

## Decision

- The middleware now uses
  `Customer.findById(id).select('-passwordHash').lean<AuthCustomer>()`.
  The hash never leaves the database, and the result is a plain object.
- New type: `AuthCustomer`, the customer's public fields plus `_id`, as a
  plain object. `req.customer` uses it.
- Response shaping moves into a standalone `toPublicCustomer(c)`. The
  document method `toPublicJSON()` calls it, so documents and plain objects
  serialize identically.
- Wallet service methods take `AuthCustomer` instead of a document.
- The destination lookup in `internalTransfer` is also lean, selecting only
  `_id accountNumber`.
- **Unchanged:** login and register still load full documents, because they
  need the hash.

## Why the exclusion projection (`-passwordHash`)

An allow-list projection would also exclude any field added later that
handlers need. Excluding only the secret keeps every other field available
and is the safer default for this object.

## Alternatives considered

- **Caching the customer between requests** (for example, keyed by token).
  Rejected because the balance and bank accounts change often, and
  invalidating a cache correctly for a wallet is harder than one indexed
  `_id` read.
- **Putting more claims in the JWT** to skip the lookup. Rejected for the
  same reason: the data goes stale, and it would also mean revoked or
  deleted customers keep access until the token expires.

## Consequences

- Handlers can't call document methods (`save()`, `toPublicJSON()`) on
  `req.customer` any more. Anything that writes uses an atomic update by
  `_id` (as record 05's `$push` already did).
- The password hash is no longer in memory for ordinary requests.

## Verification

Against the real app, over HTTP:

- `/customers/me` was identical to the old document serializer's output,
  with no `passwordHash`.
- The auth query's projection, read through Mongoose's debug hook, was
  `{"passwordHash":0}`.
- Balance, transfer (including the 400 for sending to yourself), adding a
  bank account, withdrawing to that new account, withdrawing to an unknown
  account (404), funding, and a bad token (401) all behaved as before.
