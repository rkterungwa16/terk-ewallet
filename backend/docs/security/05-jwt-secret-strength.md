# 05. Refuse weak `JWT_SECRET` values in production

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/config/env.ts` (`jwtSecret()`), `backend/.env.example`

## Context

Session tokens are HS256 JWTs signed with `JWT_SECRET` (see
`src/utils/jwt.ts`). Anyone who knows or guesses the secret can sign a
token for **any customer id** and move that customer's money. Nothing
checked the secret: `x`, `secret`, or the `.env.example` placeholder
`replace-this-with-a-long-random-string` were all accepted. HS256 secrets
can also be brute-forced offline from any one captured token, so a short or
dictionary secret can be recovered without touching the server.

## Decision

At startup, `JWT_SECRET` must be at least **32 characters** and must not be
the placeholder.

- **In production** (see record 03) the server refuses to start, with a
  message showing how to generate a secret.
- **In development/test** it logs a warning and continues, so local setups
  aren't blocked.

32 characters of random base64url is about 192 bits, well beyond brute
force. The recommended command gives 48 random bytes:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Alternatives considered

- **Measuring entropy.** Length is a proxy, and a 32-character dictionary
  phrase would pass. Entropy estimates are unreliable, though, and the
  docs point at a random generator.
- **Switching to RS256 / asymmetric keys.** Only useful when other services
  verify tokens. Not needed for a single API.

## Consequences

- **Deployment step:** if Railway's `JWT_SECRET` is shorter than 32
  characters, the API won't start after this deploys. Set a new one first.
- Changing the secret invalidates all existing tokens, so everyone is
  logged out once. Tokens last 60 minutes anyway.

## Verification

With `NODE_ENV=production` and `JWT_SECRET=short`, loading `env.ts` throws
the error. With a 64-character random secret the app starts normally.
