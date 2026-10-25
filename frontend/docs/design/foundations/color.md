# Color

The palette is small on purpose. Most of the interface is neutral; color is
reserved for brand surfaces and for meaning. All values are CSS custom
properties defined in `:root` in `src/index.css`. Always use the token,
never the raw hex.

## Brand

| Token | Value | Use |
|---|---|---|
| `--forest` | `#172b25` | Top bar, primary buttons, withdrawal-account card, chart tooltip |
| `--forest-2` | `#214337` | Icon color in metric tiles, info alerts |
| `--forest-hover` | `#24493a` | Primary button hover |
| `--mint` | `#d9f3e3` | Balance tile, active navigation item, transfer balance preview |
| `--mint-strong` | `#a9e6c1` | Logo mark |
| `--mint-ink` | `#173e2c` | Text on mint |
| `--mint-muted` | `#315f48` | Secondary text on mint |

**Why forest and mint.** Deep green says "money" and "stable" without the
alarm of red or the generic feel of corporate blue. The near-black forest
gives the chrome strong contrast with white text; the pale mint is soft
enough to fill a large tile without shouting, and it ties the balance tile,
the active nav item and the transfer preview together as "your money".

**Mint is reserved.** It marks the balance and the current location only.
Using it for anything else would dilute the balance tile's priority.

## Neutrals

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#f5f7f5` | Page background |
| `--surface` | `#ffffff` | Cards |
| `--surface-soft` | `#f2f5f3` | Hover backgrounds, subtle fills |
| `--border` | `#e3e9e5` | Card and input borders |
| `--divider` | `#edf0ee` | Lines between list rows |
| `--text` | `#17221d` | Primary text and figures |
| `--text-muted` | `#636e68` | Secondary text, labels, captions |
| `--text-subtle` | `#8a958f` | Tertiary text: nav section labels, chart axis labels, voided amounts |

Neutrals are tinted slightly green so they sit comfortably with the brand
colors instead of looking grey and cold beside them.

White cards on the off-white canvas create the tile edges with very little
contrast, which keeps the grid calm. Borders and a soft shadow do the rest.

## Meaning

| Token | Value | Tint | Meaning |
|---|---|---|---|
| `--green` | `#1f7a4b` | `--green-tint` `#e6f4eb` | Money in, success, positive change, links |
| `--amber` | `#8a5a0b` | `--amber-tint` `#fcf1dc` | Pending |
| `--red` | `#b23f3f` | `--red-tint` `#fbeaea` | Failed, errors |
| `--focus` | `#5fae82` | | Keyboard focus ring |

Rules:

- **Money out is not red.** Debits use the primary text color. Spending is
  a normal activity; coloring every payment red makes the history look like
  a list of problems and makes real failures harder to spot. Red is kept
  for things that actually went wrong.
- **Money in is green.** Credits get the one positive color so incoming
  money is easy to scan for.
- **Amber and red never appear alone.** Pending and failed states always
  carry an icon and a label too. See
  [Transaction states](../patterns/transaction-states.md).
- **Tints are backgrounds only.** Text on a tint uses the matching full
  color (green on green-tint, etc.), which keeps contrast above AA.

## What's deliberately absent

- **No gradients on surfaces.** The reference's dark card used a gradient;
  this version uses flat forest.
- **No accent color for marketing.** There is no "highlight" or "promo"
  color. If something needs emphasis, it gets size or position, not a new
  hue.
- **No dark mode yet.** All tokens are defined once. Adding dark mode means
  redefining these tokens, not editing components.

## Chart colors

The spending chart is a single series, so it uses one hue in two steps: a
pale green (`#d4e7da`) for past days and a mid green (`#3e8b61`) for today.
Hover darkens each by one step. See
[Spending chart](../components/spending-chart.md).
