# 01. Cap email length before the regex (ReDoS)

- **Severity:** High
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/validations/validate.ts` (`isEmail`), `src/validations/auth.validation.ts`

## Context

Every login and registration request runs the `isEmail` check on the
`email` field before anything else:

```ts
/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
```

The pattern has two adjacent greedy groups, `[^\s@]+` and `\.[^\s@]+`, that
can both match a dot. When the input contains many dots and then fails to
match (for example `a@` followed by thousands of dots and a trailing `@`),
the regex engine tries every way of splitting the dots between the two
groups. That is quadratic backtracking: the time grows with the square of
the input length.

Measured locally on Node 20:

| Email length | Time to reject |
|---|---|
| 5,000 chars | 87ms |
| 20,000 chars | 1,045ms |
| 40,000 chars | 2,768ms |

`express.json()` accepted bodies up to 100 KB at the time, so a single
request could hold the event loop for well over ten seconds. Node runs
JavaScript on one thread, so **every other request, webhook and reconciler
run waits** for that time. `/v1/auth/*` needs no authentication. The per-IP
limit of 20 requests a minute (performance record 12) slows this down but
doesn't stop it: 20 such requests a minute are enough to keep the API
unresponsive.

## Decision

`isEmail` now rejects any value longer than 254 characters **before**
running the regex:

```ts
const ok =
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
```

254 is the longest address SMTP can deliver to (RFC 5321 path limit), so no
real customer is affected. At that length the worst case is well under a
millisecond.

The check lives inside `isEmail` itself, not as a separate `maxLength` in
each schema. A schema stops at the first failing check, so a separate
length check only protects you if it's listed first, which is easy to get
wrong. Putting it inside the function protects every caller.

The JSON body limit was also lowered to 10 KB (record 09), which caps the
input to every other check as well.

## Alternatives considered

- **Rewriting the regex to avoid backtracking.** Possible, but subtle and
  easy to regress. A length cap makes any pattern safe whatever its shape.
- **A validation library (`validator`, `zod`).** Rejected for now, in
  keeping with the codebase's no-dependency validation. Those libraries also
  cap email length for the same reason.
- **Only lowering the body limit.** 10 KB alone still allows about 10ms of
  backtracking per request. The cap is what makes it negligible.

## Consequences

- Emails longer than 254 characters get a 400 validation error.
- The Mongoose schema has a similar pattern (`/^\S+@\S+\.\S+$/` on
  `Customer.email`). It only runs on values that already passed `isEmail`,
  so it's protected by the same cap.
- **Rule for new code:** any regex that runs on user input should run after
  a length check.

## Verification

Against the built app with no database, a 9,000-dot email to
`POST /v1/auth/login` returned **400 in 12ms**. Going by the measurements
above, it would have taken roughly 300ms before the fix, rising
quadratically with length.
