# Bento grid & responsiveness

## What "bento" means here

A bento layout arranges content as tiles of different sizes on one shared
grid. The grid gives order; the varying sizes give hierarchy. Every tile is
a card with the same radius, border, shadow and padding, so different
content still reads as one composed surface.

## Dashboard grid

### Wide (content area ≥ 920px): 6 columns

```
┌───────────────────────────────────────┬───────────────────┐
│                                       │ Spent this month  │
│         BALANCE (4 cols)              ├───────────────────┤
│                                       │ Received this mo. │
├───────────────────────────────────────┼───────────────────┤
│                                       │ Spending overview │
│     RECENT TRANSACTIONS (4 cols)      ├───────────────────┤
│                                       │ Withdrawal acct.  │
└───────────────────────────────────────┴───────────────────┘
```

Six columns let the main tiles take two-thirds (4) and the side stack
one-third (2). The two metric tiles stack beside the balance, so the row
is fully filled and the balance tile stretches to match their combined
height. This fixes a gap in the reference design, where the second metric
tile sat alone below the balance with empty space beside it.

### Medium (640–919px): 2 columns

```
┌─────────────────────────────────┐
│           BALANCE               │
├────────────────┬────────────────┤
│ Spent          │ Received       │
├────────────────┴────────────────┤
│      RECENT TRANSACTIONS        │
├────────────────┬────────────────┤
│ Spending       │ Withdrawal     │
└────────────────┴────────────────┘
```

### Narrow (< 640px): 1 column, metrics paired

The balance and transactions go full width. The two metric tiles **stay
side by side** because they are a matched pair and each is small; stacking
them would push recent transactions a full screen further down. The side
tiles stack.

### Order is hierarchy

Source order and visual order are the same at every size: balance → metrics
→ transactions → chart → withdrawal account. Screen readers and keyboard
users meet content in the same priority order sighted users do.

## Form pages grid

Transfer, Fund wallet, Withdraw and Bank accounts share one layout:

| Content width | Layout |
|---|---|
| ≥ 920px | 3 columns: form spans 2, context column spans 1 |
| 600–919px | Form full width; the two context cards side by side below |
| < 600px | Single column |

The context column holds an **Available balance** snapshot and a short
"good to know" card, so users can see what they have and what to expect
without leaving the form.

## Container queries, not viewport media queries

Content breakpoints are written with `@container` against the main content
area (`.main-content { container-type: inline-size }`), not against the
viewport.

Why: the sidebar changes width at different viewport sizes (232px, 76px,
then gone). A viewport breakpoint can't know how much room the grid
actually has. With container queries the grid responds to its real
available width, so a 1000px window with a full sidebar and a 900px window
with an icon rail lay out correctly without special cases.

Viewport media queries are used only for the **shell** (sidebar mode, top
bar contents), because those depend on the window itself.

| Kind | Breakpoints | Controls |
|---|---|---|
| Viewport `@media` | 1080px, 700px | Sidebar → rail → drawer; top bar contents |
| Container `@container` | 920px, 640px, 600px, 560px | Grid columns, card padding, type sizes in tiles |

## Rules for adding a tile

1. Decide its importance first; that sets its span. Primary content spans
   4 of 6, supporting content 2 of 6.
2. Use the `card` class so it inherits radius, border, shadow, padding.
3. Don't introduce new gutters; the grid gap is 16px.
4. Check that it doesn't leave an empty cell at any width.
5. Check it at 375px with no horizontal scroll.
