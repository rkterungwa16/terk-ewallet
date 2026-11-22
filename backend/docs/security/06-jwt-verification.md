# 06. Stricter token verification

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/utils/jwt.ts` (`verify`), `src/middlewares/auth.middleware.ts`

## Context

The hand-written JWT verifier checked the signature correctly (HMAC with a
timing-safe compare) but trusted the rest too much:

1. **Expiry was optional.** `if (payload.exp && now > payload.exp)` skipped
   the check when `exp` was missing. A token without `exp` was valid
   forever. We never issue one, but anyone who ever obtained the secret, or
   a future bug in `sign`, could create permanent tokens.
2. **The header was never read.** Not exploitable today, since the
   signature is always HS256 whatever the header says, but it means
   foreign tokens weren't recognized as such.
3. **The subject wasn't checked.** A signed token with a `sub` that isn't
   an ObjectId made `Customer.findById` throw a `CastError`, so the request
   failed with a 500 instead of a 401.
4. **Parse errors leaked through.** Invalid JSON in a token produced a 401
   whose message was the JSON parser's error.
5. **The verifier's messages went to the client** ("Invalid token
   signature", "Malformed token"), telling a forger which check failed.

## Decision

`verify` now, after the signature check:

- Parses header and payload inside a `try`, and reports any failure as
  "Malformed token".
- Requires `header.alg === 'HS256'`.
- Requires `typeof payload.sub === 'string'`.
- Requires `typeof payload.exp === 'number'`, and treats `now >= exp` as
  expired.

`authenticate()` then:

- Returns **"Session expired"** for an expired token (so the frontend can
  show a sensible message) and plain **"Unauthorized"** for everything
  else.
- Rejects a `sub` that isn't a valid ObjectId with 401 before querying.

## Alternatives considered

- **Using `jsonwebtoken` or `jose`.** Reasonable, and the file already says
  to switch for anything more demanding. These checks bring the small
  implementation to the same baseline without a dependency.
- **Checking `iat` against a server-side `tokenVersion`** for revocation.
  Worth doing (see the README's "Not done yet") but needs a schema change.

## Verification

Against the built app:

| Token | Before | After |
|---|---|---|
| Correctly signed, no `exp` | Accepted forever | 401 "Session expired" |
| Correctly signed, `sub: "not-an-id"` | 500 (CastError) | 401 "Unauthorized" |
| Expired | 401 "Token expired" | 401 "Session expired" |
