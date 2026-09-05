import type { FormErrors } from './utility';

/**
 * DISCRIMINATED UNION, generic over the form's field values (`TValues`).
 * This is the `state` type every form in the app hands to React 19's
 * `useActionState` (see components/wallet/*.tsx and pages/Login/Register).
 *
 * Why not reuse `AsyncState<TData>` from types/async.ts? Because a form
 * submission's "success" isn't really a value to render — it's a redirect,
 * or a toast, or a reset — and its "in flight" bit is already tracked by
 * `useActionState`'s own `isPending` return value. Reusing AsyncState would
 * mean carrying a `{ status: 'loading' }` variant nothing reads. This is a
 * deliberately smaller, purpose-built union rather than forcing a shared
 * one to fit two different jobs.
 */
export type FormState<TValues> =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: FormErrors<TValues> }
  | { status: 'success' };

export const idleFormState: FormState<never> = { status: 'idle' };
