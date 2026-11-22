# 09. Stricter input validation; JSON-only bodies

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/validations/wallet.validation.ts`,
  `src/validations/auth.validation.ts`, `src/routes/v1/wallet.route.ts`,
  `src/config/express.ts`

## Context

Several fields were only checked for presence, not type or shape:

| Field | Was | Risk |
|---|---|---|
| `bankCode` | `required` | Could be an object or array. It's interpolated into a Paystack URL and stored on the customer. |
| `bankAccountId` | `required` | Could be any value; compared with `String(b._id) ===`. Harmless today, but nothing stopped it being an object. |
| `password` (login) | `required` | An object reached `crypto.scrypt`, which throws: a 500. No length limit, so a huge "password" went to scrypt. |
| `name` (register) | `maxLength` | Rejected non-strings only indirectly. |
| `reference` (`/fund/verify/:reference`) | none | Any string up to the URL length limit went to the database. |
| `destinationAccountNumber` | `isNumber` | Fractions and huge numbers accepted. |

On top of that, the app parsed **urlencoded bodies with `extended: true`**
and query strings with Express's default **extended (`qs`) parser**. Both
turn `a[b]=c` into nested objects, so `email[$gt]=` arrives as
`{ email: { $gt: '' } }`. That's the classic route to MongoDB operator
injection. Our validators happened to reject it, but the API is JSON-only,
so there was no reason to accept the syntax at all. The JSON body limit was
Express's default 100 KB, which also powered record 01.

## Decision

**Validation** (each rule also rejects non-strings):

| Field | Rule |
|---|---|
| `bankCode` | `/^[A-Za-z0-9]{1,20}$/` |
| `bankAccountId` | `/^[a-f0-9]{24}$/i` (an ObjectId) |
| `reference` param | `/^[A-Za-z0-9_-]{1,100}$/`, via a new `fundVerifySchema` |
| `destinationAccountNumber` | Must be a safe integer |
| `password` (login) | `isString`, at most 128 characters |
| `password` (register) | `isString`, 8 to 128 characters (record 13) |
| `name` | `isString`, at most 128 characters |

**Parsing:**

- Removed `express.urlencoded()`. Form-encoded bodies now parse to nothing
  and fail validation.
- `express.json({ limit: '10kb' })`. The largest legitimate body is a few
  hundred bytes.
- `app.set('query parser', 'simple')`: query strings parse flat
  (`?page=2`), never into nested objects.

The webhook route is unaffected. It's mounted before these parsers and
reads its own raw body.

## Consequences

- Clients must send `Content-Type: application/json`. The frontend already
  does.
- **Rule for new endpoints:** every body field gets a type check, not just
  `required`, and any field that ends up in a query or URL gets a format
  check.

## Verification

Against the built app: `{"password": {"$gt": ""}}` returns 400 "Password
must be a string"; a urlencoded body `email[$gt]=` returns 400 "Email is
required"; invalid JSON returns 400.
