# Buttons, forms & feedback

## Buttons

`src/components/ui/Button.tsx` for `<button>`; links styled as buttons use
the same `btn` classes.

| Variant | Look | Use |
|---|---|---|
| `btn--primary` | Forest fill, white text | The one main action in a view: Send money, Send transfer, Continue to payment |
| `btn--light` | White fill, faint border | Secondary actions on the mint balance tile |
| `btn--ghost` / `btn--secondary` | Transparent, border | Low-emphasis actions: Export CSV, pagination |
| `btn--danger` | Red fill | Destructive actions (reserved) |
| `btn--block` | Full width | Card footers |

Rules:

- **One primary per view.** Two filled buttons side by side compete for
  attention and slow decisions.
- Minimum height 44px, 12px radius, 14px bold text, optional 17px icon
  before the label.
- Hover adds a subtle shadow on primary and light buttons; there's no
  movement on hover (the reference nudged buttons up 1px), which keeps the
  interface feeling steady.
- While submitting, buttons are disabled and read "Please wait…", so a
  payment can't be submitted twice.

## Text links

`text-link`: green, bold, 13px, no underline until hover. Used for "View
all ↗", "Manage ↗". The arrow signals "goes somewhere else".

## Form fields

`src/components/ui/Field.tsx`, `Select.tsx`

- Label above the input, 13px semibold muted.
- Input: 44px minimum height, 15px text (prevents iOS zoom on focus),
  12px radius, 1px border that turns green on focus.
- Errors appear below the field in red, linked with `aria-describedby`, and
  the input gets `aria-invalid`.
- Forms are a single column with 16px between fields: one question at a
  time, in a predictable order.

### Transfer preview

The transfer form shows "Balance after this transfer: ₦…" in a mint strip
above the fields, updating optimistically while the transfer runs. Mint is
used because it's about the user's balance, the same meaning as the
balance tile.

## Form page layout

Each money-movement page pairs the form with a context column:

| Page | Form card | Context cards |
|---|---|---|
| Transfer | Transfer details | Available balance; Good to know (settles immediately, ₦10 minimum, double-check the account number) |
| Fund wallet | Amount | Available balance; How it works (Paystack redirect) |
| Withdraw | Withdrawal details | Available balance; Destination accounts + link to manage |
| Bank accounts | Add a bank account | Saved accounts list |

Why: people moving money want to see what they have and what will happen
before they commit. Putting it beside the form removes the need to
navigate away to check.

## Page header

`src/components/ui/PageHeader.tsx`: eyebrow (the navigation group),
title, optional description. Used on every page except the dashboard,
which has its own greeting. See
[App shell & navigation](../layout/app-shell-and-navigation.md#page-heading).

## Alerts

`src/components/ui/Alert.tsx`

| Variant | Colors | Icon | Role |
|---|---|---|---|
| success | green on green tint | ✓ | `status` |
| error | red on red tint | ! | `alert` (announced immediately) |
| info | forest on soft surface | i | `status` |

Alerts appear at the top of the form they relate to, so the message is
next to what caused it.

## Loading and empty states

- **Spinner:** small ring plus a specific label ("Loading transactions…",
  "Confirming with Paystack…"). Specific text tells people what they're
  waiting for.
- **Empty state:** a short title and a next step ("No bank accounts saved.
  Add one to enable withdrawals."). An empty state should always say what
  to do next.
- **Placeholders keep layout.** Metric tiles show "—" while loading so the
  grid doesn't shift when data arrives.

## Sign-in and registration

A single centered card over a split background: forest across the top 38%,
canvas below. It carries the brand color onto pages without the app shell,
while the form itself stays on plain white.
