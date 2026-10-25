# Metric tiles

`MetricCard` in `src/pages/DashboardPage.tsx`

Two small tiles that answer "how is this month going?"

```
┌──────────────────────┐  ┌──────────────────────┐
│ [↗]                  │  │ [↙]                  │
│ Spent this month     │  │ Received this month  │
│ ₦84,800              │  │ ₦237,000             │
│ 16.0% less than last │  │ 163.3% more than last│
│ month                │  │ month                │
└──────────────────────┘  └──────────────────────┘
```

## Anatomy

| Part | Style |
|---|---|
| Icon tile | 38px rounded square, pale green fill, forest icon |
| Label | 13px muted |
| Value | 24px, weight 780, tabular figures, whole naira |
| Note | 12px, comparison with last month |

## Content

| Tile | Value | Note |
|---|---|---|
| Spent this month | Settled money out since the 1st of the month | % change vs. last calendar month |
| Received this month | Settled money in since the 1st | % change vs. last calendar month |

"Settled" means status `success` only. Pending and failed transactions are
excluded because they haven't changed the balance. See
[Data integrity](../patterns/data-integrity.md).

## Decisions

**Why these two metrics.** The reference showed "Spending this month" and
"My cards". The wallet has no cards, so the second tile became "Received
this month". Together they give a complete in/out picture.

**Whole naira.** These are for comparing at a glance, not reconciling, so
kobo is dropped to reduce noise. Exact amounts are in the transaction list.

**Positive direction is green; the other direction is muted, not red.**
Spending less or receiving more shows green. The opposite shows in muted
text, not red: spending more than last month isn't an error, and red would
cause unnecessary alarm.

**No comparison when there's nothing to compare.** If last month's total is
zero, a percentage would be meaningless (or infinite). The note reads
"Nothing to compare with last month" instead.

**Loading shows "—".** The tile keeps its shape while data loads, so the
grid doesn't jump.

## Grid placement

| Width | Layout |
|---|---|
| Wide | Stacked in the 2-column side slot beside the balance tile |
| Medium and narrow | Side by side, each half width |

They stay paired on phones because they're a matched set and small enough
to fit; stacking would push recent transactions too far down.
