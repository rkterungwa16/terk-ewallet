# Accessibility

Accessibility is part of financial trust: if someone can't reliably read
their balance or tell whether a payment failed, the product has failed
them.

## Contrast

- Body text and figures use `--text` (#17221d) on white or canvas: well
  above WCAG AA.
- Muted text (`--text-muted`, #636e68) passes AA (≥ 4.5:1) on white,
  canvas and the soft surface. It was darkened slightly so it also passes
  on the pale page background.
- Status colors (green, amber, red) are dark enough to pass AA as text on
  their own tints.
- Text on mint uses `--mint-ink` / `--mint-muted`, chosen for contrast on
  the mint fill.
- White on forest (top bar, primary buttons, withdrawal card) has very high
  contrast.
- `--text-subtle` (#8a958f, 3.1:1) does not meet AA for small text, so it is
  used only where the information is repeated elsewhere or non-essential:
  sidebar section labels, chart axis labels and voided (failed) amounts,
  which also carry a "Failed" label.

## Never color alone

| Meaning | Color | Second signal |
|---|---|---|
| Money in / out | Green / text color | `+` / `−` sign, direction icon |
| Pending / failed | Amber / red | Icon and text label |
| Failed amount | Muted | Strikethrough |
| Active nav item | Mint fill | Bold weight; `aria-current` from `NavLink` |
| Today in chart | Darker bar | "Today" axis label |

## Keyboard

- Everything interactive is a real `<a>` or `<button>`, so it's focusable
  and works with Enter/Space.
- A visible 3px green focus ring (`--focus`) appears on `:focus-visible`.
- **Escape** closes the mobile drawer and the profile menu.
- The mobile menu button reports `aria-expanded` and `aria-controls`.
- Source order matches visual order at every breakpoint, so tabbing follows
  the visual hierarchy.

## Screen readers

- Landmarks: `header` (top bar), `aside` with labelled `nav` groups,
  `main`.
- Search is a `role="search"` form with a visually hidden label.
- The balance tile is a `section` labelled by its heading.
- Icons are `aria-hidden`; their meaning is always in adjacent text.
- In the tablet icon rail, labels are visually hidden but each link keeps a
  `title`, and its accessible name still comes from the label.
- The masked withdrawal account number reads "Account ending 4821" rather
  than the dots.
- The spending chart's bars are hidden from assistive tech; a visually
  hidden table gives every day and amount.
- Alerts use `role="alert"` for errors (announced immediately) and
  `role="status"` otherwise. Spinners use `role="status"` with
  `aria-live="polite"`.
- Form errors are linked to inputs with `aria-describedby` and
  `aria-invalid`.

## Touch and zoom

- Interactive targets are at least 44px tall.
- Inputs use 15px text so mobile Safari doesn't zoom on focus.
- No horizontal scrolling at 375px width; long references truncate with an
  ellipsis instead.
- Type sizes use `clamp()` and respect browser zoom.

## Motion

- Transitions are short (≤ 0.2s) and limited to color and shadow; nothing
  slides or bounces during normal use.
- `prefers-reduced-motion: reduce` disables animations and transitions
  globally, including the loading spinner.

## Known gaps

- No dark mode yet (tokens are ready for it).
- Chart tooltips appear on hover only; keyboard and screen-reader users get
  the same values from the hidden table rather than the tooltip.
- The profile menu uses `role="menu"` but doesn't yet implement arrow-key
  navigation between items (it currently has one item).
