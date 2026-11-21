# 01. Index the transaction history query and bound its pagination

- **Status:** shipped in [PR #7](https://github.com/rkterungwa16/terk-ewallet/pull/7) (commit `627839a`)
- **Code:** `src/models/transaction.model.ts`, `src/services/wallet.service.ts`,
  `src/controllers/wallet.controller.ts`, plus index cleanup in
  `customer.model.ts` and `paystack-event.model.ts`

## Context

`GET /v1/wallet/transactions` is the busiest read in the API. The Dashboard
and the Transactions page each request 200 rows whenever they load. The
query is:

```js
Transaction.find({ customer }).sort({ createdAt: -1 }).skip(...).limit(...)
```

There were three problems:

1. **No index for the sort.** `customer` and `createdAt` were only indexed
   separately. MongoDB could find a customer's rows through the `customer`
   index, but then had to sort them in memory on every request (a `SORT`
   stage). That cost grows with each customer's history, and in-memory
   sorts fail outright past MongoDB's memory limit.
2. **No limit on page size.** `perPage` went straight from the query string
   into `.limit()`, so `?perPage=1000000` returned a customer's entire
   history. A non-numeric value became `NaN`.
3. **Full documents loaded for a read-only list.** Each row was built into a
   full Mongoose document (change tracking, getters, the `meta` blob), only
   to be turned back into a plain object for the response.

There was also noise: several fields declared `index: true` on top of
`unique: true`, which declares each index twice.

## Decision

- Add a compound index `{ customer: 1, createdAt: -1 }`. The filter field
  comes first and the sort field second, so MongoDB walks the index already
  in order and stops after `skip + limit` entries.
- Remove the single-field `customer` index. The compound index starts with
  `customer`, so it also serves plain lookups by customer.
- Remove `index: true` where `unique: true` already creates the index
  (`transactions.reference`, `customers.accountNumber`,
  `paystackevents.reference`).
- Check `page` and `perPage` in the controller. Each must be a positive
  whole number, or it falls back to the default. `perPage` is capped at 200
  (the most the frontend asks for) and `page` at 1000 (to bound how far
  `skip` walks).
- Read the list with `.select(PUBLIC_TRANSACTION_FIELDS).lean()`, and shape
  it with a standalone `toPublicTransaction()`. The document method
  `toPublicJSON()` now calls the same function, so the two can't drift
  apart.

## Alternatives considered

- **Cursor (keyset) pagination** on `(createdAt, _id)`. This removes `skip`'s
  cost entirely, but it changes the API contract and the frontend. It's
  deferred and listed under "Not done yet" in the README. The `page` cap
  bounds the worst case until then.
- **Returning 400 for invalid pagination** instead of falling back to
  defaults. Rejected because a malformed `page` isn't worth an error, and
  the defaults are safe.
- **Leaving `accountNumber` indexed on transactions.** It's kept for now. No
  code queries by it, but it may serve admin lookups. It's a candidate to
  drop.

## Consequences

- Responses are unchanged: same shape and same order.
- Clients that asked for more than 200 rows now get 200.
- Mongoose builds the new index on startup (`autoIndex`). **It does not drop
  the old `customer_1` index.** Drop it by hand after deploying:
  `db.transactions.dropIndex('customer_1')`. Leaving it costs a little on
  every write, but nothing breaks.

## Verification

Run against a local MongoDB seeded with 5,000 transactions:

- Query plan for page 2: `IXSCAN(customer_1_createdAt_-1) → SKIP → FETCH →
  LIMIT`, with no `SORT` stage. 60 keys and 30 documents examined.
- The new `listTransactions` output was byte-for-byte identical to the old
  hydrated-document output for the same page.
- After the change, each model's `schema.indexes()` lists every index once.
