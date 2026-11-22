# 03. Treat a missing `NODE_ENV` as production

- **Severity:** High
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/config/env.ts`; behavior in `src/config/db.ts`,
  `src/middlewares/cors.middleware.ts`, `src/middlewares/error.middleware.ts`

## Context

`env.ts` read `NODE_ENV` with a default of `'development'`, and
`isProduction` was `nodeEnv === 'production'`. Three debugging aids turn on
outside production:

| Aid | Where | Risk in production |
|---|---|---|
| Stack traces in every error response | `errorHandler` | Reveals file paths, library versions and code structure |
| `mongoose.set('debug', true)` | `db.ts` | Logs every query **with its documents**, including `passwordHash` on registration, emails, balances and bank details, into the hosting provider's log store |
| Any `localhost`/`127.0.0.1` origin allowed by CORS | `cors.middleware.ts` | Any page served from a visitor's own machine can call the API |

If `NODE_ENV` was forgotten on a host (easy to do on Railway, where it's
just another variable), production silently ran in development mode. The
default was failing open.

## Decision

Fail closed. The default is now `'production'`, and only an explicit
`development` or `test` turns the aids on:

```ts
const nodeEnv = optional('NODE_ENV', 'production');
const isProd = nodeEnv !== 'development' && nodeEnv !== 'test';
export const isProduction = isProd;
```

Values like `staging` or typos such as `prod` also get production behavior,
since any environment reachable from the internet should.

`backend/.env.example` keeps `NODE_ENV=development` and now explains what
it turns on, so local development is unchanged.

## Alternatives considered

- **Require `NODE_ENV` and refuse to start without it.** Stricter, but it
  breaks anyone who never set it, for no extra safety over defaulting to
  production.
- **Keep the default and document it.** Rejected: the failure is silent,
  and the leaked logs can't be taken back.

## Consequences

- Local runs without a `.env` file now behave like production: no stack
  traces, no query logging, and only `CORS_ORIGINS` origins allowed. Copy
  `.env.example` to `.env`, or set `NODE_ENV=development`.
- `db.ts` still checks `nodeEnv === 'development'` for query logging, so
  `test` doesn't log queries. That's intended.

## Verification

From a copy of the built app with no `.env` file and `NODE_ENV` unset,
`env.nodeEnv` is `production` and `isProduction` is `true`.
