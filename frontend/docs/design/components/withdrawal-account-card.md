# Withdrawal account card

`src/components/dashboard/PayoutAccountCard.tsx`

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ WITHDRAWAL ACCOUNT          [▭]  │ │
│ │                                  │ │
│ │ •••• ••••  4821                  │ │
│ │ ACCOUNT NAME              GTBank │ │
│ │ ADA OKAFOR                     ◯ │ │
│ └──────────────────────────────────┘ │
│ 1 saved account            Manage ↗  │
└──────────────────────────────────────┘
```

## Why this tile exists

The reference design had a debit-card preview. This wallet doesn't issue
cards, so showing one would be invented content. The tile was kept, because
it gives the side stack a strong visual anchor, but repurposed to show
something real and useful: the bank account withdrawals are paid out to.

## Anatomy

| Part | Content |
|---|---|
| Visual | Flat forest panel styled like a card: label, chip, masked number, account name, bank name |
| Number | Last 4 digits only, with the rest masked. The visible text is announced as "Account ending 4821" |
| Footer | Number of saved accounts and a link to manage them |

## Decisions

**Card-like, but not a card.** The visual borrows the shape of a payment
card because it's instantly recognizable as "an account I own". The label
says "Withdrawal account" so nobody mistakes it for a card they can spend
with.

**Mask the number.** Showing only the last four digits is a familiar
security cue, and it's enough to tell accounts apart.

**Flat forest, no gradient.** The reference used a gradient; this uses the
flat brand color to stay consistent with the restrained palette. The chip
keeps a small gradient because it imitates metal.

**Empty state is a prompt.** With no saved accounts, the panel reads "No
bank account saved yet. Add one to withdraw your balance." and the footer
link becomes "Add account". It explains why it matters (withdrawals need
it), not just that something is missing.

## Placement

Below the spending chart in the side stack (wide), beside it (medium), or
stacked last (narrow).
