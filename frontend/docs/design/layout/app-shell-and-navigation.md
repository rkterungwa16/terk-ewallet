# App shell & navigation

Implemented in `src/components/layout/AppLayout.tsx`.

```
┌────────────────────────────────────────────────────────────┐
│ [logo] Wallet                   [ search… ]  (AO) Ada ▾    │  top bar (forest, sticky)
├────────────┬───────────────────────────────────────────────┤
│ WORKSPACE  │  page heading                                 │
│ ▣ Overview │  ┌──────────────────────┐ ┌────────┐          │
│ ▤ Transact │  │                      │ │        │          │
│ MOVE MONEY │  │   content grid       │ │        │          │
│ ⇄ Transfer │  └──────────────────────┘ └────────┘          │
│ + Fund     │                                               │
│ ↓ Withdraw │                                               │
│ ACCOUNT    │                                               │
│ ⌂ Banks    │                                               │
└────────────┴───────────────────────────────────────────────┘
   sidebar card (white, sticky)
```

## Top bar

A full-width forest bar, sticky at the top (72px; 64px on phones).

| Element | Behavior | Why |
|---|---|---|
| Logo mark + "Wallet" | Links to Overview | Standard "home" affordance |
| Search | Submits to `/transactions?q=…`; the Transactions page picks up the query and filters | Finding a specific payment is the most common reason to search a wallet; sending users straight to the filtered list avoids a separate search UI |
| Profile button | Initials avatar, name, "Personal account" | Confirms whose wallet this is at a glance |
| Profile menu | Name, email, account number, Sign out | Account identity and sign-out live together, out of the main navigation |

The dark bar frames the light content area and gives the brand a strong
presence without adding color to the content itself.

**Removed from the reference:** the notification bell. The product has no
notifications, and a bell with an unread dot would be a false signal.

## Sidebar

A white card that floats beside the content (sticky below the top bar),
rather than a full-height dark panel. Keeping it the same material as the
tiles makes it feel like part of the bento grid.

### Navigation groups

| Group | Items | User intent |
|---|---|---|
| Workspace | Overview, Transactions | "What's happening with my money?" |
| Move money | Transfer, Fund wallet, Withdraw | "I want to do something with it" |
| Account | Bank accounts | "Manage where money goes" |

Grouping by intent means people can find a task by thinking about what they
want, not by remembering a page name. All money movement is together; all
history is together; account settings are last and separate.

- Groups are separated by a divider and an uppercase label.
- The active page uses the mint fill, the same color as the balance tile,
  reinforcing "you are here".
- The order never changes between screen sizes.

**Removed from the reference:** "My Cards" (no card feature), "Settings"
and "Help Center" (no such pages), and the "Need a hand?" support box (no
support channel). Sign out moved into the profile menu.

## Responsive behavior

| Viewport | Sidebar | Top bar |
|---|---|---|
| > 1080px | Full sidebar with labels (232px) | Logo, search, avatar + name |
| 701–1080px | **Icon rail** (76px): icons only, labels hidden, `title` tooltips | Unchanged |
| ≤ 700px | **Drawer**: hidden until opened from the menu button; slides over content with a dimmed backdrop | Menu button, logo, avatar only (search and name hidden) |

Why an icon rail on tablets: it keeps navigation one tap away and in the
same place as on desktop, while giving the content the width it needs for
a two-column grid.

Why a drawer on phones: horizontal space is too precious for a rail, and a
bottom tab bar couldn't hold six destinations without crowding. The drawer
shows the full grouped list, identical to desktop.

### Drawer and menu behavior

- Opens from the top-left menu button, which switches to a close icon and
  sets `aria-expanded`.
- Closes when you choose a page, tap the backdrop, or press Escape.
- Opening the drawer closes the profile menu and vice versa, so two
  overlays never stack.
- The profile menu also closes on any click outside it and on route change.

## Page heading

Every page starts with the same heading block: a small eyebrow
(e.g. "Move money", "History"), a large title, and an optional
description. On the dashboard the eyebrow is "Your finances at a glance",
the title is a time-of-day greeting with the user's first name, and today's
date sits on the right (hidden on narrow screens).

The eyebrow repeats the navigation group, so users always know which part
of the app they're in.
