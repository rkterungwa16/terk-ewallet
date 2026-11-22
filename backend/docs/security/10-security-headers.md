# 10. Security headers on the API and the frontend

- **Severity:** Medium
- **Status:** on branch `security/audit-fixes` (commit `3d3bdc6`)
- **Code:** `src/middlewares/securityHeaders.middleware.ts`,
  `src/config/express.ts`, `frontend/vercel.json`

## Context

Neither app sent any security headers. The API only disabled
`X-Powered-By`; the Vercel config only had the SPA rewrite.

- **Frontend:** with no Content Security Policy, any injected script could
  load more code from anywhere and send data anywhere, including the
  session token, which lives in `localStorage` (see README). With no frame
  restrictions the app could be framed for clickjacking, e.g. tricking a
  user into confirming a transfer.
- **API:** responses carry balances, ledgers and bank details, but nothing
  stopped browsers or proxies caching them, sniffing them as HTML, or
  framing them.

## Decision

### API (`securityHeaders` middleware, mounted first after request logging)

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | A JSON response must never run or load anything |
| `X-Content-Type-Options` | `nosniff` | Never reinterpret JSON as HTML or script |
| `X-Frame-Options` | `DENY` | Older-browser equivalent of `frame-ancestors` |
| `Referrer-Policy` | `no-referrer` | |
| `Cache-Control` | `no-store` | Customer data must not sit in any cache |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (production only) | Browsers always use HTTPS. Railway terminates TLS at its edge. |

Written by hand rather than with `helmet`, in keeping with the codebase's
no-dependency approach. The set is small because the API serves no HTML.

### Frontend (`vercel.json`, all paths)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://terk-ewallet-production.up.railway.app;
form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'
```

plus `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a
`Permissions-Policy` that turns off camera, microphone, geolocation and
payment.

Notes on the CSP:

- **`script-src 'self'`** with no `'unsafe-inline'`. The Vite build emits
  one external module script and no inline scripts (checked in
  `dist/index.html`).
- **`style-src 'unsafe-inline'`** is needed for React `style={{...}}`
  attributes (the spending chart bar heights). Inline styles are far less
  dangerous than inline scripts.
- **Google Fonts** are allowed because `index.css` imports Inter from
  there.
- **`connect-src`** pins the API origin. This is what stops a script from
  sending stolen data elsewhere.
- Paystack checkout is a full-page redirect, not an iframe or form post,
  so it needs no CSP entry.

## Consequences

- **If the API URL changes** (a new Railway domain, a custom domain), add
  it to `connect-src` in `vercel.json`, or every API call from the
  deployed frontend will be blocked.
- Vercel preview deployments use the same headers, so previews can only
  talk to the production API. Add other API origins if previews use a
  staging backend.
- The headers only apply on Vercel. The local Vite dev server doesn't send
  them.
- **Adding a third-party script, font or analytics tool** needs a CSP
  update.

## Verification

Against the built API, `GET /v1/status` returns `nosniff`, `no-store` and
the CSP. The frontend headers can only be checked after deploying to
Vercel: open the browser's network tab and check the document response,
and the console for CSP violations.
