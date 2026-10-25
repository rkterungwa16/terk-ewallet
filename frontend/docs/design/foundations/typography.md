# Typography

## Typeface

**Inter**, loaded from Google Fonts at weights 400–800, with the system UI
font stack as fallback (`--font-ui`).

Why Inter:

- Built for screens, with a tall x-height that stays legible at the small
  sizes used for captions and metadata.
- Excellent **tabular figures**, which matter more in a wallet than in
  almost any other product (see below).
- Neutral and widely used in financial products, so it reads as
  "trustworthy software" rather than as a brand statement.

One family is used for everything. A second display face was used in an
earlier iteration for the balance only; it was dropped to match the
reference and to keep the system simpler. Hierarchy now comes from size,
weight and tracking.

Transaction references are the one exception: they use the system
monospace stack at 11px, because they are machine identifiers that users
copy and compare character by character.

## Type scale

| Role | Size | Weight | Tracking | Where |
|---|---|---|---|---|
| Balance figure | 32–46px (fluid) | 780 | −0.045em | Balance tile |
| Page title | 26–32px (fluid) | 750 | −0.04em | Greeting, page headers |
| Large metric | 26px | 780 | −0.045em | Spending chart total |
| Metric | 24px (20px on narrow) | 780 | −0.04em | Metric tiles, balance snapshot |
| Brand | 20px (18px on phone) | 750 | −0.03em | Top bar |
| Card title | 16px | 700 | −0.02em | Card headings |
| Body / input | 14–15px | 400–600 | normal | Lists, forms |
| Row title | 14px (13px on narrow) | 700 | normal | Transaction titles |
| Caption / meta | 12–13px | 400–650 | normal | Subtitles, dates, labels |
| Section label | 11–12px uppercase | 700–750 | 0.06–0.12em | Sidebar groups, "Available balance" |
| Chart axis | 11px | 400 | normal | Day labels |

The two largest sizes use `clamp()` so they scale smoothly with the
viewport instead of jumping at breakpoints.

## Decisions

**Big numbers get tight tracking.** Large, heavy figures look loose at
default letter-spacing. Negative tracking (−0.04 to −0.045em) makes the
balance read as one solid value. The reference used −0.065em; that was
eased slightly so digits like `1` and `,` don't collide.

**Small labels get wide tracking.** Uppercase section labels are spaced out
(up to 0.12em) so they are legible at 11px and clearly read as labels, not
content.

**Tabular figures everywhere money appears.** `font-variant-numeric:
tabular-nums` is set on every amount, balance, account number and metric.
Each digit takes the same width, so amounts in a list line up and a balance
doesn't shift width as it changes.

**Weights carry hierarchy, not color.** Figures are 750–780, titles 700,
labels 600–650, body 400–500. Muted color is used only for secondary
information, never to create emphasis.

**Minimum size is 11px**, used only for the uppercase labels, chart axis and
transaction references. All reading text is 12px or larger, and form inputs
are 15px so mobile browsers don't zoom in on focus.

## Number formatting

All money goes through formatters in `src/utils/format.ts`, built on
`Intl.NumberFormat('en-NG')`:

| Formatter | Example | Used for |
|---|---|---|
| `nairaFormatter` | ₦184,250.75 | Balances, exact values |
| `signedNairaFormatter` | +₦75,000.00 / −₦24,500.00 | Transaction amounts |
| `wholeNairaFormatter` | ₦84,800 | Summary metrics, chart total |

Exact values (balances, transactions) always show kobo. Summary figures
drop it, because they are for comparison at a glance, not reconciliation.
Transaction amounts always carry an explicit sign, so direction is clear
without color.
