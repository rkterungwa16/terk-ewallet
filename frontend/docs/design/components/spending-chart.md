# Spending chart

`src/components/dashboard/SpendingChart.tsx`, data from `weeklySpending()`
in `src/utils/insights.ts`.

```
Spending overview
Settled money out, by day

₦84,800
Spent in the last 7 days

                    ██
       ▄▄           ██        ▓▓
       ██   ▄▄      ██        ▓▓
 ▁▁    ██   ██  ▁▁  ██   ▁▁   ▓▓
 Mon  Tue  Wed  Thu  Fri  Sat Today
```

## What it shows

Settled money out for each of the last seven days, ending today, plus the
seven-day total above it.

## Decisions

**Lead with the number.** The total is shown large above the bars. Most
people want "how much this week"; the bars answer the follow-up "when".

**Rolling seven days, not a calendar week.** The reference showed a fixed
Mon–Sun week. A rolling window always has seven full days of context, so
on a Monday the chart isn't six empty bars. The last bar is labelled
"Today" so the window is unambiguous.

**One hue, two steps.** It's a single series, so it uses one color: pale
green for past days, a stronger green for today. Today is highlighted
because "where am I now" is the first question.

**Minimum bar height.** Days with no spending show a 4% stub rather than
nothing, so every day has a visible slot and the baseline reads clearly.

**Bar marks.** Bars have 4px rounded tops and square bottoms anchored to the
baseline, with an 8px gap between them. No gridlines or y-axis: with one
series and exact values on hover, they would add clutter without adding
information.

**Hover tooltips.** Hovering a bar shows the full date and the exact amount
in a small forest tooltip. Tooltips on the first and last bars align to
the edge instead of centering, so they never overflow the card.

**Accessible table.** The visual chart is hidden from assistive technology;
a visually hidden table with every day and amount is provided instead, so
screen-reader users get the same data in a form they can navigate.

**No period switcher.** The reference had a filter button that swapped in
illustrative data. That was removed: the chart only shows real data, and a
control that doesn't do anything real would undermine trust.

## Placement

Top of the side stack on wide screens (2 of 6 columns), half width on
medium screens, full width on phones.
