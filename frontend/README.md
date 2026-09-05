# Wallet Frontend

A React 19 + TypeScript + Vite frontend for the paystack-wallet-api backend.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed walkthrough of every
React hook and TypeScript pattern used, and why.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your backend's /v1 URL
npm run dev
```

Requires the paystack-wallet-api backend running (default expected at
`http://localhost:4000/v1`).

## Scripts

```bash
npm run dev       # start the Vite dev server
npm run build     # type-check (tsc -b) then produce a production build in dist/
npm run preview   # preview the production build locally
npm run lint       # oxlint
```

## Routes

| Path | Page | Notes |
|---|---|---|
| `/login`, `/register` | Auth | Public |
| `/` | Dashboard | Balance + recent activity |
| `/transactions` | Transaction history | Search, filter, pagination |
| `/transfer` | Wallet-to-wallet transfer | Optimistic balance update |
| `/fund` | Fund wallet | Redirects to Paystack checkout |
| `/fund/callback` | Fund confirmation | Handles the Paystack redirect back |
| `/withdraw` | Withdraw to bank | Requires a saved bank account |
| `/bank-accounts` | Manage bank accounts | Resolves + saves a Paystack transfer recipient |

All routes except `/login` and `/register` require an authenticated session
(enforced by `ProtectedRoute`).

## Project layout

```
src/
  api/          typed fetch client, auth token store, endpoint functions
  types/        domain DTOs, discriminated-union state types, utility types
  hooks/        useApiRequest, useAuthToken, useAuth
  context/      AuthContext + its reducer
  components/
    ui/         generic Field/Select, Button, Alert, Card, Spinner, EmptyState
    auth/       LoginForm, RegisterForm
    wallet/     BalanceCard, TransferForm, FundWalletForm, WithdrawForm, BankAccountForm
    transactions/  TransactionList, TransactionRow, TransactionFilters
    layout/     AppLayout, ProtectedRoute
  pages/        one file per route, lazy-loaded from router.tsx
  router.tsx    route table
```
