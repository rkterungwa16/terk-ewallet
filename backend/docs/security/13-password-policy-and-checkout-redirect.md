# 13. Password minimum of 8; only redirect to Paystack checkout

- **Severity:** Low
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/validations/auth.validation.ts`,
  `frontend/src/components/auth/RegisterForm.tsx`,
  `frontend/src/components/ui/Field.tsx`,
  `frontend/src/components/wallet/FundWalletForm.tsx`

## Password policy

### Context

Registration accepted passwords of 6 characters. For an app that holds
money, 6 is below the common baseline: NIST SP 800-63B sets a minimum of 8.
Login accepted a password of any length (see record 09).

### Decision

- Register: 8 to 128 characters, must be a string.
- Login: must be a string, at most 128 characters.
- The register form sets `minLength={8}` and `maxLength={128}` on the
  password input, so the browser stops short passwords before submitting.
  `Field` gained `minLength`/`maxLength` props for this.

No composition rules (digits, symbols) were added. NIST advises against
them: they push people towards predictable patterns without adding much
strength.

### Consequences

- Existing customers with 6 or 7 character passwords **can still log in**.
  The minimum only applies at registration, and there's no password-change
  endpoint yet to enforce it later.

## Checkout redirect

### Context

After `POST /wallet/fund/initialize`, the frontend sent the browser to
whatever `authorizationUrl` the API returned:

```ts
window.location.href = authorizationUrl;
```

The URL comes from Paystack through our API, so it's normally trusted. But
if the API or the response were ever tampered with, this line would send
customers to any page, such as a fake checkout collecting card details, or
a `javascript:` URL.

### Decision

The form only redirects when the URL parses, uses `https:`, and its host is
exactly `checkout.paystack.com`. Otherwise it shows "Could not start
payment. Please try again."

### Consequences

If Paystack ever changes its checkout host, funding will stop until the
check is updated. That would be visible immediately, which beats sending
customers to an unexpected domain.
