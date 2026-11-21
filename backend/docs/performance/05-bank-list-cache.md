# 05. Cache the bank list; save bank accounts with an atomic `$push`

- **Status:** shipped in [PR #11](https://github.com/rkterungwa16/terk-ewallet/pull/11) (commit `fa24219`)
- **Code:** `src/utils/cachedValue.ts`, `src/services/wallet.service.ts`
  (`listBanks`, `addBankAccount`)

## Context

- `GET /v1/wallet/banks` called Paystack's `/bank` endpoint on every request.
  The list of Nigerian banks changes a few times a year at most.
- `addBankAccount` made **three Paystack calls in a row**: resolve the
  account, create a transfer recipient, then fetch the whole bank list just
  to look up a display name.
- It then saved the customer with `customer.save()`. When the same customer
  added two accounts at once, both requests started from the same loaded
  document, and one account could be lost.

## Decision

**A small cache helper, `cachedValue(loader, ttlMs)`**, which:

- returns the cached value while it's fresh (24 hours for banks);
- shares one in-flight load among all callers during a refresh, so a cold
  burst of requests makes one Paystack call, not dozens;
- never caches a failure. If a refresh fails but an expired value is held,
  it returns that stale value instead of an error. If nothing is cached, the
  error is rethrown.

**`addBankAccount` changes:**

- The bank name lookup now runs *alongside* the resolve and recipient calls
  (started first, awaited last), not after them. It also uses the cache, so
  it usually needs no call at all.
- If the bank list can't be loaded, the bank code is used as the name. The
  name is only a label, and losing it shouldn't fail the save.
- The account is added with `findByIdAndUpdate(..., { $push: { bankAccounts:
  ... } }, { new: true, runValidators: true })`, a single atomic write that
  can't overwrite a concurrent one.

## Alternatives considered

- **A cache library or Redis.** Not worth a dependency or infrastructure for
  one small, slow-changing list.
- **Caching failures briefly** (negative caching). Not needed: the
  stale-on-error fallback covers outages once anything has been cached.
- **Refreshing the cache in the background on a timer.** Refreshing on
  demand is simpler and costs one slow request per day.

## Consequences

- The cache is per process. With several instances, each keeps its own copy.
  That's fine for data like this.
- A bank added by Paystack shows up within 24 hours, or on restart.
- Saving a bank account takes one fewer Paystack round trip in the common
  case.

## Verification

| Case | Result |
|---|---|
| 3 concurrent cold calls | Loader ran once |
| Expired, and the loader fails | Stale value served |
| Nothing cached, and the loader fails | Error rethrown |
| After a failure | Next call retries |
| 4 `listBanks` calls | 1 Paystack `/bank` call |
| 2 concurrent adds from stale copies of one customer | Both accounts saved, balance untouched |
| Bank name | From the cache, no new call |
| Bank list down and nothing cached | Save succeeds, name falls back to `058` |
