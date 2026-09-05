import {
  useCallback, useEffect, useReducer, useRef,
} from 'react';
import { ApiError } from '../api/client';
import {
  assertNever, type ApiErrorShape, type AsyncState,
} from '../types/async';

// DISCRIMINATED UNION for the reducer's actions, mirroring the shape of
// AsyncState itself. Each action carries exactly the payload its transition
// needs — 'success' carries data, 'error' carries the error, 'loading' and
// 'reset' carry nothing — so a call like dispatch({ type: 'success' }) with
// a missing `data` field is a compile error, not a runtime `undefined`.
type Action<TData> =
  | { type: 'loading' }
  | { type: 'success'; data: TData }
  | { type: 'error'; error: ApiErrorShape }
  | { type: 'reset' };

function reducer<TData>(_state: AsyncState<TData>, action: Action<TData>): AsyncState<TData> {
  switch (action.type) {
    case 'loading':
      return { status: 'loading' };
    case 'success':
      return { status: 'success', data: action.data };
    case 'error':
      return { status: 'error', error: action.error };
    case 'reset':
      return { status: 'idle' };
    default:
      // TYPE NARROWING + exhaustiveness: if a fifth Action variant is added
      // above without a matching `case`, `action` here is not narrowed to
      // `never`, and assertNever's parameter type rejects it at compile
      // time. This is the standard trick for making a switch over a
      // discriminated union self-checking.
      return assertNever(action);
  }
}

function toErrorShape(err: unknown): ApiErrorShape {
  // `err` from a catch clause is `unknown` in strict TS — we can't assume
  // it's an Error, let alone our own ApiError, until we check.
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, errors: err.fieldErrors };
  }
  if (err instanceof Error) {
    return { message: err.message, status: 0 };
  }
  return { message: 'An unexpected error occurred', status: 0 };
}

/**
 * PERFORMANCE + CORRECTNESS: why useReducer instead of useState here.
 * A fetch has four co-dependent pieces of state (idle/loading/data/error)
 * that always change together as a single transition. useReducer models
 * that transition as one dispatch instead of 2-3 sequential setState calls,
 * which keeps the state machine's invariants (see types/async.ts) enforced
 * in one place (the reducer) rather than re-derived at every call site.
 *
 * WHY useRef for the AbortController: we need a mutable value (the
 * in-flight request's controller) that survives across renders but must
 * NOT trigger a re-render when it changes — that's precisely what useRef
 * is for, as opposed to useState. Aborting the previous request when a new
 * one starts (or the component unmounts) prevents a slow, stale response
 * from overwriting a newer one ("request waterfall" race condition) and
 * avoids the classic "setState after unmount" warning/leak.
 */
export function useApiRequest<TData>(
  fetcher: (signal: AbortSignal) => Promise<TData>,
  deps: ReadonlyArray<unknown>,
) {
  const [state, dispatch] = useReducer(reducer<TData>, { status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  // useCallback gives `execute` a stable identity across renders (as long
  // as `fetcher`'s identity is itself stable — see call sites, which wrap
  // their fetcher in useCallback too). That stability is what lets
  // `execute` be safely listed in the effect's dependency array below
  // without causing an infinite refetch loop, and it's what lets a
  // "Retry" button pass `execute` straight to an onClick without
  // recreating a new function every render.
  const execute = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    dispatch({ type: 'loading' });
    try {
      const data = await fetcher(controller.signal);
      if (!controller.signal.aborted) dispatch({ type: 'success', data });
    } catch (err) {
      if (!controller.signal.aborted) dispatch({ type: 'error', error: toErrorShape(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher]);

  useEffect(() => {
    execute();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { state, refetch: execute };
}
