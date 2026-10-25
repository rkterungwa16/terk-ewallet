# Iconography

## The set

All icons live in `src/components/ui/Icon.tsx` as inline SVG paths, drawn
on a 24×24 grid with a 1.8px round-capped stroke and no fill. They follow
the line style of the reference design.

```tsx
<Icon name="transfer" />
```

| Name | Meaning |
|---|---|
| `wallet` | Brand mark, balance label |
| `dashboard` | Overview |
| `receipt` | Transactions |
| `transfer` | Transfer, transfer sent |
| `plus` | Fund wallet / add money |
| `withdraw` | Withdraw, withdrawal to bank, CSV download |
| `bank` | Bank accounts |
| `arrowUp` | Send money |
| `downLeft` | Money received, wallet funded |
| `reverse` | Reversal |
| `trend` | Spending metric |
| `search`, `menu`, `close`, `chevron`, `logout` | Interface controls |
| `check`, `clock`, `alert` | Completed, pending, failed |

## Why inline SVG

- No icon library dependency or extra network request.
- Icons inherit `currentColor`, so they take the color of the text around
  them and follow every state (hover, active, status) automatically.
- `Icon` is typed: `name` must be a key of the set, so a typo fails to
  compile.

## Sizing

- Default: **18px**.
- 17px inside buttons, 19–21px in the sidebar rail and logo mark, 13px in
  status labels.
- Icons sit inside a tinted rounded square (38–42px) when they identify a
  tile or a transaction, giving them a consistent footprint in lists.

## Rules

- **Icons support labels; they don't replace them.** Every icon on a
  button or nav link has visible text beside it. In the tablet icon rail,
  where labels are hidden, each link has a `title` and the accessible
  name still comes from the hidden label.
- **Decorative by default.** Icons render with `aria-hidden="true"` because
  the adjacent text already says what they mean.
- **One icon, one meaning.** The same glyph always means the same thing
  across the app (e.g. `downLeft` is always money coming in).
- **Status icons are mandatory.** Pending and failed states always show
  their icon alongside the color and label. See
  [Transaction states](../patterns/transaction-states.md).
