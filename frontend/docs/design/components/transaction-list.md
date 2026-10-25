# Transaction list

`src/components/transactions/TransactionList.tsx`,
`src/components/transactions/TransactionRow.tsx`

The same list component is used on the dashboard (latest 5) and on the
Transactions page (paginated, filterable).

## Row anatomy

```
┌────┐
│ ⇄  │  Transfer to 4                         −₦35,000.00
└────┘  23 Oct 2026, 08:49 · WLT-8812888       ✓ Completed
 icon   title / meta                           amount / status
```

| Part | Content | Style |
|---|---|---|
| Icon | Depends on operation and direction | 42px rounded square (38px narrow). Green tint for money in, neutral grey for money out |
| Title | Human-readable description (below) | 14px bold |
| Meta | Date and time · reference | 12px muted; reference in monospace. Truncates with an ellipsis on narrow screens |
| Amount | Signed, with kobo | Bold, tabular figures. Green for money in, primary text for money out, struck through if failed |
| Status | Icon + label | See [Transaction states](../patterns/transaction-states.md) |

## Titles

The API gives an operation type; the row turns it into plain language:

| Operation | Direction | Title | Icon |
|---|---|---|---|
| deposit | in | Wallet funded | `downLeft` |
| withdrawal | out | Withdrawal to bank | `withdraw` |
| transfer | out | Transfer to {account number} | `transfer` |
| transfer | in | Transfer received | `downLeft` |
| reversal | either | Reversal | `reverse` |

Why: "transfer" and "deposit" are system terms. "Transfer to 4" tells
users who the money went to; "Wallet funded" says what happened in their
own words.

## Layout decisions

**A list, not a table.** An earlier version used an HTML table. Tables don't
adapt to narrow screens without horizontal scrolling, which is ruled out.
The flex-based row keeps the amount and status pinned to the right at every
width while the title and meta take the remaining space and truncate.

**Amount and status stacked on the right.** People scan a wallet history
down the right edge for amounts. Status sits directly under its amount, so
the two are always read together.

**Divider lines, not boxes.** Rows are separated by a 1px divider, keeping
the list light and dense.

**Reference is secondary but present.** References matter when disputing a
payment or matching a bank statement, so they're always visible, but in
small monospace in the meta line, not competing with the title.

## Dashboard transactions card

```
Recent transactions                         View all ↗
Track money moving in and out
─────────────────────────────────────────────────────
  … 5 rows …
─────────────────────────────────────────────────────
[        ↓ Export activity (CSV)                    ]
```

- Header with title, subtitle and a "View all" link to the full history.
- The list has no extra card padding at the edges of the dividers: the card
  uses zero padding and the sections pad themselves, so the footer divider
  runs edge to edge.
- **Export activity (CSV)** downloads all loaded transactions (date, type,
  status, amount, channel, reference, counterparty). It only appears when
  there is something to export.
- Spans 4 of 6 columns on wide screens, full width otherwise.

## Transactions page

Uses the same rows inside a card with a search box (reference or account
number) and a type filter in the card header, plus Previous / Next
pagination. The top bar search links here with `?q=` pre-filled. The
filters sit side by side on wide screens and stack on phones.

## Empty and loading states

- No transactions: "No transactions yet. Fund your wallet to get started."
- Loading: inline spinner with "Loading transactions…".
- Error: an error alert with the API message.
