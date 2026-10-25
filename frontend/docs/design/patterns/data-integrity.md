# Data integrity

**Every number and status on screen comes from the user's real wallet
data.** This is a design rule, not just an engineering one: in a financial
product, a single invented figure undermines trust in all the others.

## Where each figure comes from

| Figure | Source | Computation |
|---|---|---|
| Available balance | `GET /customers/me` → `balanceNaira` | As returned |
| Account number / name | `GET /customers/me` | As returned |
| Recent transactions | `GET /wallet/transactions` | First 5 of the loaded list |
| Spent this month | Loaded transactions | Sum of completed debits since the 1st of the current month |
| Received this month | Loaded transactions | Sum of completed credits since the 1st |
| Month-over-month % | Loaded transactions | (this month − last month) ÷ last month; omitted if last month is 0 |
| 7-day spending | Loaded transactions | Completed debits grouped by local calendar day, last 7 days |
| Withdrawal account | `customer.bankAccounts[0]` | As returned |

Calculations live in `src/utils/insights.ts`.

## Rules

**Only completed transactions count.** Pending and failed transactions are
listed (with their status) but excluded from every total, because they
haven't changed the balance.

**"Spent" means money out of the wallet.** Transfers sent and withdrawals.
It is not limited to purchases, because the wallet doesn't categorize
transactions.

**Totals are computed from a loaded window.** The dashboard loads the
latest 200 transactions, the same window as the Transactions page. Monthly
figures are complete as long as this month and last month together have
fewer than 200 transactions. A production version with heavier usage
should get these totals from the API instead.

**No comparison without a baseline.** If last month had nothing, the note
says so instead of showing an infinite or misleading percentage.

**Labels say exactly what's measured.** "Available balance", "Settled money
out, by day", "Spent in the last 7 days". Precise labels prevent people
from assuming a number means something it doesn't.

## What was left out of the reference design, and why

The reference was a static mockup with sample content. Elements without a
real source in this product were removed or replaced:

| Reference element | Outcome | Reason |
|---|---|---|
| "Total balance" | Renamed "Available balance" | More precise |
| "Account active" pill | Replaced by account number | No account-status data |
| "Bank-level security" footnote | Replaced by account name | Unverifiable claim |
| "My cards: 02 Active" tile | Replaced by "Received this month" | No card feature |
| Debit card preview | Replaced by withdrawal account card | No card feature |
| Notification bell with unread dot | Removed | No notifications |
| Settings, Help Center nav items | Removed | No such pages |
| "Need a hand?" support box | Removed | No support channel |
| Spending chart period filter | Removed | It swapped in illustrative data |
| Fixed Mon–Sun week | Rolling 7 days | Always shows a full week of context |

If any of these features are built later, the elements can return,
connected to real data.
