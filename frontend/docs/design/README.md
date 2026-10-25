# UI Design System

How the wallet frontend looks, and why. These documents explain the visual
language, layout, components and patterns behind the interface, along with
the reasoning for each decision. Engineering choices (hooks, TypeScript
patterns, performance) are documented separately in
[ARCHITECTURE.md](../../ARCHITECTURE.md).

The visual direction follows the MonoWallet reference design (forest top bar,
mint balance tile, white cards on a pale canvas), adapted to what this wallet
actually does and to a set of trust and responsiveness requirements.

## The short version

1. **Trust over decoration.** Restrained color, strong contrast, readable
   type, and no gradients or effects that compete with the numbers.
2. **Hierarchy follows importance.** Available balance first, then the ways to
   move money, then recent activity, then supporting insight.
3. **Bento grid.** Tiles of different sizes on one grid, sized by how much
   each piece of information matters.
4. **One spacing scale.** Everything sits on an 8px rhythm.
5. **Predictable navigation.** Tasks are grouped by intent and always live
   in the same place, at every screen size.
6. **Honest data.** Every number on screen comes from the user's real
   wallet. Features the product doesn't have are not mocked up.

## Contents

### Foundations
The raw materials every screen is built from.

| Document | Covers |
|---|---|
| [Principles](foundations/principles.md) | The six principles above, in depth, and how they resolve conflicts |
| [Color](foundations/color.md) | Palette, tokens, what each color means and where it may be used |
| [Typography](foundations/typography.md) | Typeface, type scale, numeric figures, tracking |
| [Spacing & shape](foundations/spacing-and-shape.md) | 8px scale, radii, borders, shadows, touch targets |
| [Iconography](foundations/iconography.md) | Icon set, sizing, when an icon is required |

### Layout
How screens are structured and how they adapt.

| Document | Covers |
|---|---|
| [App shell & navigation](layout/app-shell-and-navigation.md) | Top bar, sidebar, navigation groups, profile menu, search |
| [Bento grid & responsiveness](layout/bento-grid-and-responsive.md) | Dashboard grid, form-page grid, breakpoints, container queries |

### Components
The building blocks, what each is for, and why it looks the way it does.

| Document | Covers |
|---|---|
| [Balance card](components/balance-card.md) | The primary tile and its actions |
| [Metric tiles](components/metric-tiles.md) | Spent / received this month |
| [Transaction list](components/transaction-list.md) | Rows, icons, titles, amounts, the transactions card |
| [Spending chart](components/spending-chart.md) | The 7-day bar chart |
| [Withdrawal account card](components/withdrawal-account-card.md) | Saved bank account tile |
| [Buttons, forms & feedback](components/buttons-forms-and-feedback.md) | Buttons, fields, alerts, empty and loading states, page headers |

### Patterns
Rules that cut across components.

| Document | Covers |
|---|---|
| [Transaction states](patterns/transaction-states.md) | Completed, pending, failed; credit vs. debit |
| [Data integrity](patterns/data-integrity.md) | Which numbers are shown, how they're computed, what was left out |
| [Accessibility](patterns/accessibility.md) | Contrast, focus, keyboard, screen readers, motion |

## Where things live in code

| Concern | Location |
|---|---|
| Design tokens and all styles | `src/index.css` (tokens in `:root` at the top) |
| Icons | `src/components/ui/Icon.tsx` |
| Shell, navigation, search, profile | `src/components/layout/AppLayout.tsx` |
| Dashboard | `src/pages/DashboardPage.tsx`, `src/components/dashboard/` |
| Money formatting | `src/utils/format.ts` |
| Derived figures (monthly totals, weekly spend, CSV) | `src/utils/insights.ts` |
