# Balance card

`src/components/wallet/BalanceCard.tsx`

The most important element in the product and the first thing the eye
should land on.

```
┌──────────────────────────────────────────────── ◯ ─┐
│ ▣ AVAILABLE BALANCE                    [ Acct 2 ]  │
│                                                    │
│ ₦184,250.75                                        │
│ Ready to spend, send or withdraw                   │
│                                                    │
│ [↗ Send money] [+ Add money] [↓ Withdraw]          │
│ ────────────────────────────────────────────────── │
│ Account name  Ada Okafor                           │
└────────────────────────────────────────────────────┘
```

## Anatomy

| Part | Content | Decision |
|---|---|---|
| Label | Wallet icon + "AVAILABLE BALANCE", uppercase | Says exactly what the number is. "Available" is more precise than the reference's "Total balance", since pending transactions are not included |
| Pill | "Acct {number}" | The account number is what people share to receive transfers, so it's in view at all times. Replaces the reference's "Account active" pill, which made a status claim the API doesn't provide |
| Amount | Full balance with kobo | Largest type on the page (32–46px, weight 780), tabular figures |
| Caption | "Ready to spend, send or withdraw" | Short, plain-language framing of what the number means |
| Actions | Send money (primary), Add money, Withdraw | The three ways to move money, next to the money they move |
| Footnote | Account name | Confirms whose wallet this is, for people sharing details. Replaces the reference's "bank-level security" line, which we can't substantiate |

## Why it looks the way it does

**The only tinted tile.** Every other tile is white. Mint fill, no border
and the biggest type make it unmistakably first in the hierarchy, without
needing a loud color.

**Actions live inside the balance.** Quick actions were a separate tile in
an earlier iteration. Moving them in (as the reference does) means users
read "how much I have" and "what I can do with it" as one unit, and it
removes one tile from the grid.

**One primary action.** Send money is forest (filled); the others are white.
Sending is the most frequent money movement, and a single primary button
avoids three competing calls to action.

**Withdraw was added.** The reference had two actions. Withdraw is a core
task in this product, so it's here too. On phones the buttons share the
row and wrap to a second line rather than shrinking text.

**Decoration is a whisper.** Faint concentric rings in the top-right corner
(2–12% opacity) add some depth to a large flat area. They sit behind the
content and are ignored by pointer events.

## Grid placement

| Width | Span |
|---|---|
| Wide (6 cols) | 4 columns, stretches to the height of the two stacked metric tiles |
| Medium / narrow | Full width |

## Performance note

The card is wrapped in `React.memo`. It re-renders only when the `customer`
object changes, not whenever the dashboard re-renders for other reasons.
See [ARCHITECTURE.md](../../../ARCHITECTURE.md).
