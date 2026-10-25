# Transaction states

Being able to tell, instantly and unambiguously, whether money moved is
the core trust job of a wallet. Every state is shown with **at least two**
signals so nobody depends on color alone.

## Status

| Status | Label | Icon | Style | Amount |
|---|---|---|---|---|
| success | Completed | ✓ `check` | Muted text, no background | Normal |
| pending | Pending | 🕒 `clock` | Amber text on amber-tint pill | Normal |
| failed | Failed | ⓘ `alert` | Red text on red-tint pill | **Struck through, muted** |

### Why "Completed" is quiet

Most transactions succeed. If every row had a bright green badge, the list
would be noisy and the rare problem rows would be harder to find. Completed
is the expected state, so it's styled as plain muted text. Pending and
failed get a tinted pill because they need attention.

### Why failed amounts are struck through

A failed transaction never changed the balance. Showing its amount at full
weight suggests it did. The strikethrough plus muted color says "this
happened, but the money didn't move". It's also understandable without
color.

### Why pending is amber, not red

Pending isn't a failure, just not finished. Amber signals "wait" without
the alarm of red.

## Direction: money in vs. money out

| Direction | Sign | Amount color | Icon tile |
|---|---|---|---|
| In (credit) | `+` | Green | Green tint, `downLeft` or `reverse` |
| Out (debit) | `−` | Primary text | Neutral grey, operation icon |

- The **sign** is always shown (`signDisplay: 'always'`), so direction is
  readable without color.
- **Money out is not red.** Spending is normal. Red is reserved for things
  that went wrong, so a failed payment stands out.
- The **icon** reinforces direction and operation type at a glance.

## Where these states appear

- Dashboard recent transactions
- Transactions page
- Every derived figure (metric tiles, spending chart) counts **completed**
  transactions only, so pending and failed rows never inflate totals. See
  [Data integrity](data-integrity.md).

## Optimistic updates

When a transfer is submitted, the transfer preview shows the expected new
balance immediately. If the transfer fails, it falls back to the real
balance automatically, and an error alert explains what happened. The
balance on screen is never left showing money that didn't move.
