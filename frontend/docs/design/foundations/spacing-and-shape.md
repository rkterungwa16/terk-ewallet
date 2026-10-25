# Spacing & shape

## The 8px scale

| Token | Value | Use |
|---|---|---|
| `--space-half` | 4px | Tightest pairs: a label and its value, icon and text in a badge |
| `--space-1` | 8px | Related elements: buttons in a row, fields in a filter bar, items in a list |
| `--space-2` | 16px | Inside cards (between blocks), between dashboard tiles |
| `--space-3` | 24px | Card padding on wide screens, between page header and content |
| `--space-4` | 32px | Top of the content area, major section breaks |

The rule of thumb:

- **8px** between things that belong together
- **16px** inside a card and between tiles
- **24–32px** between major sections

Why a scale at all: a bento grid puts many differently sized tiles side by
side. If their internal spacing varies, the page looks accidental. A single
scale makes every tile feel like part of the same system, even when their
contents differ.

**Between tiles is 16px, not 24px.** The reference used 16px, and tighter
gutters make the tiles read as one composed grid rather than separate
floating cards. Page-level sections (header to grid) keep 24px so the
hierarchy between "page" and "tile" stays clear.

**Card padding is 24px on wide screens and 16–18px on narrow ones.** Cards
use flexbox with a 16px gap, so the spacing *inside* a card is 16px
everywhere; only the outer padding steps down when space is tight.

A few values sit off the scale where optical alignment needed it: 12px
around list rows and in the top bar, 10px between balance-tile buttons,
14px vertical padding on transaction rows. These are the exceptions; new
components should start from the scale.

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius` | 18px | Cards and tiles (16px on narrow screens) |
| `--radius-sm` | 12px | Buttons, inputs, nav items, icon tiles, menus |
| — | 13–14px | Transaction icons, withdrawal-account visual |
| — | 999px | Pills: account number pill, pending/failed status |
| — | 4px top only | Chart bars |

Large, soft radii make the tiles feel approachable and are a defining trait
of the bento look. Inner elements use a smaller radius than their container
so corners nest visually.

## Borders and shadows

- Every card has a 1px `--border` **and** a very soft shadow
  (`--shadow`: `0 12px 30px` at 6% forest). The border defines the edge;
  the shadow adds just enough lift to separate the tile from the canvas.
- The balance tile drops its border: the mint fill is its edge.
- Lists use `--divider` lines between rows, never boxes around each row.
- Elevated surfaces (profile menu, chart tooltip, mobile drawer) get a
  stronger shadow because they float above content.

## Touch targets

Interactive elements are at least **44px** tall: buttons, inputs, nav
links, profile menu items. Icon buttons in the top bar are 42px with
generous surrounding space. This keeps the app comfortable on phones
without separate mobile components.

## Width constraints

- The shell is capped at 1440px and centered, so very wide monitors don't
  stretch tiles into unreadable lines.
- Narrow single-column pages (payment callback) cap at 560px.
- On phones the page has a 16px side gutter.
