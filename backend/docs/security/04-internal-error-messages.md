# 04. Stop sending internal error details to clients

- **Severity:** High
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/middlewares/error.middleware.ts`

## Context

`errorConverter` turned any thrown value into an `ApiError` using the
error's own message and status:

```ts
new ApiError(error.message || 'Internal server error', error.status || 500)
```

So whatever an unexpected error said went straight to the client, in
production too. For example:

- MongoDB driver errors name hosts, replica set members and timeouts
  (`connection <monitor> to 10.x.x.x:27017 closed`).
- Mongoose `CastError` and `ValidationError` messages name models, fields
  and paths (`Cast to ObjectId failed for value "..." at path "_id" for
  model "Customer"`).
- A `TypeError` from a bug reveals code structure.

Each one helps an attacker map the system. It also meant unexpected errors
weren't logged anywhere: they went to the client and nowhere else.

## Decision

`errorConverter` now sorts errors into four groups:

| Error | Response | Logged |
|---|---|---|
| `ApiError` (ours) | Its own message and status, unchanged | 5xx only |
| Duplicate key (`code 11000`) | 409 "A record with these details already exists" (unchanged) | No |
| `CastError` / `ValidationError` | 400 "Invalid request" | No |
| `http-errors` client errors with `expose: true` and a 4xx status (bad JSON, payload too large) | Their message and status | No |
| **Anything else** | **500 "Internal server error"** | **Yes, in full** |

Outside production the original stack is copied onto the generic 500, so
local debugging still shows where it came from.

`errorHandler` also logs every 5xx with its message (for example our own
502s from Paystack), so server failures are visible in the platform logs.

## Alternatives considered

- **A static allow-list of messages.** Too brittle: every new `ApiError`
  would need adding.
- **Hiding all messages in production.** Rejected: `ApiError` messages are
  written for customers ("Insufficient wallet balance") and the frontend
  shows them.

## Consequences

- Clients can no longer tell a database outage from a bug. Both are a
  generic 500. That's the point: the logs have the detail.
- **Rule for new code:** to show a message to the customer, throw an
  `ApiError`. Anything else becomes a generic 500.

## Verification

Against the built app: invalid JSON returns 400 with the parser's message
(safe, `expose: true`). A token whose subject isn't an ObjectId, which used
to produce a 500 with Mongoose's cast message, now returns 401 (record 06).
