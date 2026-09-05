# Architecture & Design Decisions

This is a Vite + React 19 + TypeScript frontend for the paystack-wallet-api
backend. Every non-trivial hook choice and TypeScript pattern in this
codebase is commented in place; this document collects the reasoning in one
place, organized the way it was requested.

Run it with:

```bash
npm install
cp .env.example .env
npm run dev
```

---

## Part 1 — React APIs & Hooks, and why each one

| Hook / API | Where | Why this one, specifically |
|---|---|---|
| useState | Filter inputs, simple toggles | Default for local, independent state with no cross-field invariants. |
| useReducer | useApiRequest, AuthContext/authReducer | Several state fields that must change together as one atomic transition; the reducer is the one place that can produce a new state, enforcing the state machine's invariants. |
| useContext | useAuth | Global session state needed across the tree without prop-drilling. |
| useMemo | AuthContext's context value; TransactionsPage's filtered/paginated lists | Referential stability for a context value (avoids spurious consumer re-renders) and avoiding recomputation of an expensive derived array. |
| useCallback | AuthContext's login/register/logout/updateCustomer; every useApiRequest fetcher | Stable function identity so effects/memoized children don't re-run/re-render on unrelated parent renders. |
| React.memo | BalanceCard, TransactionRow, TransactionList | Skips re-rendering a pure, props-only component when props are shallow-equal; applied to the highest-traffic, cheapest-to-skip components. |
| useRef | useApiRequest's AbortController | A mutable value that survives renders but must not itself trigger one. |
| useId | Field, Select | Collision-free label/input id pairing, stable across instances and Strict Mode double-invoke. |
| useDeferredValue | TransactionsPage search | Keeps the search input responsive while a large filtered list re-renders in the background. |
| useTransition | TransactionsPage pagination | Marks page changes as low-priority/interruptible, with isPending driving an "updating…" affordance. |
| useSyncExternalStore | useAuthToken | The access token's source of truth is localStorage, outside React; this is the hook built for subscribing to that correctly under concurrent rendering. |
| useActionState (React 19) | All wallet/auth forms | Replaces manual isSubmitting/error/try-catch-finally with one hook. |
| useOptimistic (React 19) | TransferForm | Shows the balance decreasing instantly on submit, reconciling automatically on success or failure. |
| React.lazy + Suspense | router.tsx | Route-level code-splitting — verified in the production build below. |
| useEffect | AuthContext session hydration, useApiRequest fetch-on-mount | Reserved for real synchronization with an external system (network, subscriptions) only. |

Build output confirms real per-route code-splitting:

```
dist/assets/LoginPage-*.js          1.29 kB
dist/assets/DashboardPage-*.js      1.34 kB
dist/assets/TransferPage-*.js       1.81 kB
dist/assets/WithdrawPage-*.js       1.63 kB
dist/assets/BankAccountsPage-*.js   2.16 kB
dist/assets/TransactionsPage-*.js   2.64 kB
dist/assets/index-*.js            292.34 kB   (shared react/react-dom/router runtime)
```

---

## Part 2 — Performance decisions, explained in depth

### useReducer instead of several useState calls for async state

The naive pattern (`loading`/`error`/`data` as three separate `useState`
calls) allows impossible combinations — `loading=true` and a stale `error`
and stale `data` all set at once — and forces every consumer to guess the
right precedence to check them in. Every one of `useApiRequest`'s four
states is produced by exactly one `dispatch` in `execute()`, so the
transition is atomic and the reducer is the single place a new `AsyncState`
can come from.

### useRef for the AbortController, specifically

`useApiRequest` needs a value that persists across renders, is mutated
outside the render cycle, but must never itself cause a re-render — exactly
`useRef`'s contract, and not `useState`'s (every `setState` schedules a
render). Storing the in-flight controller here lets a fast page change or
unmount abort a now-irrelevant request, preventing a slow response from
overwriting fresher data, and preventing a `dispatch` into an unmounted
component's reducer.

### useMemo on the AuthContext value, specifically

Context consumers re-render whenever the value they read changes identity
(`Object.is`), regardless of which fields they actually use. AuthProvider
re-renders on every dispatch, including ones unrelated to a given consumer
(e.g. `customer_updated` firing after a transfer, for a component that only
reads `logout`). Memoizing the value object on its real dependencies means
its identity — and therefore consumer re-renders — only changes when
`state` actually changes.

### React.memo on BalanceCard/TransactionRow/TransactionList, and not everywhere

`memo` adds a props comparison on every render, so wrapping a cheap,
rarely-rendered component in it can cost more than it saves. It's applied
specifically where it pays off: `BalanceCard` is the highest-traffic
component on the dashboard (any unrelated dashboard state change would
otherwise re-render it for nothing), and `TransactionRow` is rendered N
times per page, where skipping unnecessary re-renders matters more as N
grows — the same principle a virtualization library builds on, one step
before actual windowing becomes necessary. Both rely on `Customer`/
`Transaction` objects being replaced wholesale, never mutated in place,
which is what makes memo's shallow comparison correct here.

### useDeferredValue vs. a hand-rolled setTimeout debounce

The search `<input>` is a fully synchronous controlled input — every
keystroke updates state immediately, with no debounce. The expensive work
(filtering up to 200 rows, then re-rendering the table) runs off
`useDeferredValue(search)` instead. A fixed `setTimeout` debounce delays by
a guessed duration regardless of actual device speed — wasted latency on a
fast machine, insufficient on a slow one where filtering itself takes
longer than the delay. `useDeferredValue` instead lets React's scheduler
decide, based on real rendering cost on that device, when to catch up to
the latest value, degrading gracefully under load instead of applying a
one-size-fits-all delay. It composes cleanly with `useTransition` for
pagination — both let React deprioritize expensive re-renders while
keeping input and clicks instant.

### useSyncExternalStore vs. reimplementing it with useState + useEffect

It's possible to fake "read localStorage and re-render on change" with
`useState` seeded from `localStorage.getItem` plus a `useEffect` subscribing
to the `storage` event. Two real problems: first, tearing under concurrent
rendering — React 18+ can pause and resume a render, and a store change in
that window can make a useState+useEffect version render with one snapshot
and commit with another, which `useSyncExternalStore` is built to prevent.
Second, `apiFetch` isn't a component — it's a plain function that needs the
current token on every request, which a React-state-only token would force
either into an argument threaded everywhere or a stale closure read.
Modeling the token as a real external store means `useAuthToken` and
`apiFetch` both read the same single source of truth, and login/logout in
one tab correctly updates every other open tab via the native `storage`
event.

### useOptimistic vs. waiting for the round-trip

`TransferForm` shows the post-transfer balance immediately, before the
transfer request resolves. For a wallet specifically, the balance number is
how a user confirms their action registered at all — a frozen number for a
few hundred milliseconds reads as "did my click even work?".
`useOptimistic` derives its displayed value from the real `customer` prop
on every render, so on failure (the catch branch never calls
`updateCustomer`) the optimistic guess naturally falls back to the real,
unchanged balance with no manual rollback code.

### useActionState vs. manual isSubmitting/try/catch/finally

Every form here would otherwise need its own `isSubmitting` state, an error
state, and a submit handler carefully setting/resetting `isSubmitting` on
every branch including the error path — easy to get wrong on one of them.
`useActionState` bundles exactly that lifecycle into one hook: an async
action function in, `[state, formAction, isPending]` out, bound directly to
`<form action={...}>` so native form submission semantics keep working with
no manual `onSubmit`/`preventDefault`.

### Route-level code-splitting (React.lazy + Suspense)

Every page is wrapped in `lazy(() => import('./pages/X'))`. Without this,
all nine pages ship in one bundle downloaded before first paint, even for a
visitor who only ever looks at the dashboard. The build output above
confirms real, separate chunks per route; Suspense's fallback covers the
brief window while an unfetched chunk downloads, with no manual loading
state to track.

---

## Part 3 — TypeScript concepts, where and why

### Interface vs. type alias

Consistent rule throughout: `interface` for object shapes that are
entities or contracts, especially ones crossing a boundary — API DTOs in
`types/domain.ts`, component props throughout `components/`. Interfaces
communicate "at least these properties" and support declaration merging,
matching a DTO a backend team could extend later. `type` is used for
anything algebraic interface can't express: unions (`CustomerRole`),
discriminated unions (`AsyncState`, `AuthState`, `FormState`), mapped types
(`FormErrors<T>`), conditional types (`DataOf<T>`, `RequestBody<M,B>`), and
derived shapes built from utility types (`RegisterPayload` in
`api/endpoints.ts`).

### Generics

`apiFetch<TResponse, TMethod, TBody>` — one fetch implementation fully
typed for every endpoint. `useApiRequest<TData>` — one async-state machine
reused for `Customer`, `Transaction[]`, `Bank[]`, each fully typed.
`Field<TValues>` / `Select<TOption extends SelectOption>` — see
Polymorphism below. `paginate<T>` — generics apply to plain functions too,
not just hooks/components.

### Union types

`CustomerRole`, `HttpMethod`, `TransactionOperation`/`Channel`/`Status`,
`OperationFilter` — closed sets of string literals wherever only a fixed
set of values is valid. A typo becomes a compile error instead of a silent
runtime bug.

### Discriminated unions and the state-machine pattern

Three independent state machines: `AsyncState<TData, TError>`
(idle/loading/success/error, for any single request), `AuthState`
(anonymous/hydrating/authenticated/error, for the session), `FormState
<TValues>` (idle/error/success, for a form submission). Each variant only
carries the fields valid for it, which is what makes illegal combinations
unrepresentable rather than merely "not supposed to happen." The `status`
field is the tag TypeScript narrows on.

### Type narrowing

Discriminant narrowing: `if (auth.state.status !== 'authenticated') return
null;` in TransferForm/WithdrawForm/BankAccountsPage narrows `auth.state`
to the authenticated branch for everything below. Exhaustive switch
narrowing: `ProtectedRoute` switches on every `AuthState` variant, with
`default: return assertNever(state)` compiling only because `state` has
narrowed to `never` there. Guards on `unknown`: `isApiErrorShape` and
`err instanceof ApiError` checks throughout the forms narrow a caught
`unknown` down to a shape safe to read.

### Utility types

`Pick`/intersection derives `RegisterPayload`/`LoginPayload` from
`Customer` so payload types can't drift from the entity they describe;
`readonly`/`ReadonlyArray` on parameters that shouldn't mutate their input
(`paginate`, `filterTransactions`); `Record<AlertVariant, string>` for an
exhaustive icon lookup that fails to compile if a variant is missing.

### keyof and indexed access types

`Field<TValues>`'s `name: keyof TValues & string` prop — see Polymorphism.
`FieldValue<T, K extends keyof T> = T[K]` reads a single property's type
out of a generic type by its key, the type-level equivalent of `obj[key]`.

### Type inference

`useReducer(reducer, { status: 'idle' })` infers the full `AsyncState` type
from the reducer's own signature with no manual type argument at most call
sites; `apiFetch` call sites let `TResponse` flow from the calling
function's own return-type annotation rather than repeating it;
`useActionState`'s `[state, formAction, isPending]` is inferred from the
action function passed in.

### unknown / never

`unknown`: every catch block treats its error as `unknown`, not `any`;
nothing is assumed about it until a guard (`instanceof ApiError`,
`instanceof Error`) proves it. The parsed JSON body in `api/client.ts` is
likewise `unknown` until `isApiErrorShape` narrows it. `never`:
`assertNever` takes a `never` parameter specifically so passing it any
real, un-narrowed type is a compile error — the mechanism behind every
exhaustive switch in the app. `DataOf<TState>` resolves to `never` for any
non-success variant, signaling "no valid data to extract" at the type
level.

### Mapped and conditional types

Mapped: `FormErrors<T> = { [K in keyof T]?: string }` generates a per-field
error slot from a form's value type so it can't drift out of sync with the
fields that actually exist; `Immutable<T>` maps every property to its
readonly equivalent. Conditional: `RequestBody<TMethod, TBody> = TMethod
extends 'GET' | 'DELETE' ? undefined : TBody` makes passing a body to a GET
request a compile error; `DataOf<TState>` uses `infer` to pull the `data`
type back out of a specific `AsyncState` variant, the same mechanism the
standard library's `Awaited<T>`/`ReturnType<T>` use internally.

---

## Part 4 — Patterns: polymorphism and discriminated state machines

### Discriminated state machines

Covered above — the load-bearing pattern of the app, appearing three times
because it's the right tool whenever a set of mutually exclusive states
exists and the transitions between them matter, not just the current state
in isolation.

### Polymorphism, the idiomatic TypeScript/React way

This codebase has no class components and no inheritance hierarchy
anywhere — not an oversight. Two other kinds of polymorphism cover
everything a class hierarchy would have here, without its rigidity:

1. Parametric polymorphism (generics): `Field<TValues>` and
   `Select<TOption extends SelectOption>` are each written once and
   instantiated differently at every call site
   (`<Field<LoginPayload> name="email" />`,
   `<Field<InternalTransferPayload> name="amount" />`), with the compiler
   checking every instantiation against the real shape it was given. A
   class-inheritance version would be more rigid for no benefit — there's
   no shared behavior to override, just a shared shape to parameterize
   over.
2. Data-driven "polymorphism" (variant props): `Alert`'s `variant` prop
   changes both styling and icon based on a plain data value via a
   `Record<AlertVariant, string>` lookup, rather than an `ErrorAlert
   extends Alert` class hierarchy — composition and data in, JSX out, the
   idiomatic React approach.

Both are used because that's what the actual problems in this codebase
called for: a form field adapting to different value shapes, and a
component adapting to different data — neither benefits from an
inheritance tree.
