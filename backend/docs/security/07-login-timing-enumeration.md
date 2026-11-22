# 07. Make login take the same time for unknown emails

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/services/auth.service.ts` (`login`, `dummyHash`)

## Context

Login looked up the customer and only ran scrypt if one was found:

```ts
if (!customer || !(await verifyPassword(params.password, customer.passwordHash)))
```

The error message was the same either way ("Incorrect email or password"),
but the **timing** wasn't. scrypt takes tens of milliseconds on purpose, so
a login for an unknown email returned noticeably faster than one for a
registered email. By timing responses, anyone could check whether a given
email has a wallet here, which is useful for targeted phishing and for
choosing which accounts to attack.

## Decision

Always run scrypt. For an unknown email, verify the submitted password
against a **dummy hash**: a real scrypt hash of 32 random bytes, computed
once per process on first use and cached.

```ts
const passwordOk = await verifyPassword(
  params.password,
  customer ? customer.passwordHash : await dummyHash(),
);
if (!customer || !passwordOk) throw new ApiError('Incorrect email or password', 401);
```

The dummy hash is a real hash with the same salt length and key length, so
verifying against it costs the same as verifying against a customer's hash.
The random password can never match.

## Alternatives considered

- **A fixed `setTimeout` delay for unknown emails.** Hard to match scrypt's
  real cost, which varies with load, so the timing gap shows up again.
- **A hard-coded dummy hash in source.** Works, but a hash generated at
  runtime is guaranteed to use the current scrypt parameters.

## Consequences

- Logins for unknown emails now cost a scrypt run, like every other login.
  They're already rate-limited per IP and per email (performance
  record 12).
- The very first unknown-email login in a process computes the dummy hash,
  so it costs two scrypt runs. Negligible.
- **Registration still reveals registered emails**: it returns 409 "An
  account with this email already exists". That's a deliberate UX
  trade-off, noted in the README.
