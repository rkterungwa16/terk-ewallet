# Principles

A wallet is a place people check before they act: *how much do I have, did
that payment go through, can I send this now?* Every design decision here
serves those questions. When two goals conflict, the principles below are in
priority order.

## 1. Trust over decoration

People judge whether to trust a financial product largely by how calm and
precise it looks. A busy, glossy interface reads as a promotion; a quiet one
reads as a ledger.

- **Restrained palette.** One dark brand color, one soft accent, neutrals,
  and a small set of meaning-carrying colors. See [Color](color.md).
- **No decorative gradients.** The only gradient in the product is the tiny
  "chip" on the withdrawal-account card, where it imitates a physical object.
  Decoration elsewhere is limited to faint concentric rings on two tiles,
  at 2–12% opacity, so they never compete with content.
- **Strong contrast.** Body text and figures meet WCAG AA against their
  backgrounds. See [Accessibility](../patterns/accessibility.md).
- **Precise numbers.** Balances and transaction amounts always show kobo
  (two decimals) and use tabular figures so columns of money align.

## 2. Hierarchy follows importance

The order of importance on the dashboard is fixed:

1. **Available balance.** The largest tile, the only tinted one, and the
   biggest type on the page.
2. **Ways to move money.** Send, Add and Withdraw live *inside* the balance
   tile, so the number and what you can do with it are read together.
3. **Recent transactions.** The widest content tile, directly below.
4. **Supporting insight.** Monthly totals, the weekly chart and the
   withdrawal account are smaller tiles to the side.

Size, color, weight and position all reinforce the same order. Nothing
lower in the hierarchy is allowed to be louder than something above it.

## 3. Bento grid

Information is arranged as tiles of varying size on a single grid, like
compartments in a bento box. The grid gives the page structure; the varying
tile sizes give it hierarchy. See
[Bento grid & responsiveness](../layout/bento-grid-and-responsive.md).

Rules:

- Every tile is a card with the same radius, border and shadow, so the grid
  reads as one system.
- Tile size reflects importance, not the amount of content.
- No empty cells. The reference design left a gap beside one small card on
  wide screens; this implementation stacks both metric tiles beside the
  balance tile so the grid is always fully packed.

## 4. One spacing scale

All spacing comes from an 8px scale: 8px between related elements, 16px
inside cards and between tiles, 24–32px between major sections. Consistent
spacing is what makes a grid of different-sized tiles feel orderly rather
than random. See [Spacing & shape](spacing-and-shape.md).

## 5. Predictable navigation

Navigation is grouped by what the user is trying to do:

- **Workspace**: look at your money (Overview, Transactions)
- **Move money**: Transfer, Fund wallet, Withdraw
- **Account**: Bank accounts

The groups and their order are identical on desktop, tablet and phone; only
the presentation changes. See
[App shell & navigation](../layout/app-shell-and-navigation.md).

## 6. Honest data

Every figure on screen is computed from the user's real wallet data. Where
the reference design showed features this product does not have (payment
cards, notifications, a support desk, a security claim), those elements were
replaced with real equivalents or removed. A wallet that shows invented
numbers loses the trust principle 1 is trying to earn. See
[Data integrity](../patterns/data-integrity.md).

## Resolving conflicts

- **Fidelity to the reference vs. honesty:** honesty wins. The look is
  borrowed; the content is not.
- **Density vs. clarity:** clarity wins. Mobile shows fewer columns and
  truncates long references rather than shrinking text below 11px.
- **Color vs. accessibility:** never rely on color alone. Every color that
  carries meaning is paired with an icon, a sign, a label or a strikethrough.
