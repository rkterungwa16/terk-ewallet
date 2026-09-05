import { assertNever } from '../types/async';
import type { Customer } from '../types/domain';

/**
 * DISCRIMINATED UNION as a state machine, again (see types/async.ts for the
 * first one) — but modeling a different domain: *authentication status*
 * rather than *a single request's status*. The two are related but not the
 * same thing: hydrating the session on page load, logging in, and being
 * logged in are meaningfully different states with different valid actions
 * from each ('login' can't be called while already 'authenticated' without
 * logging out first, for instance) — a state machine is the right tool
 * whenever a set of states like this exist and transitions between them
 * are meaningful, which is also true of the funding flow in
 * WalletContext-adjacent components.
 */
export type AuthState =
  | { status: 'anonymous' }
  | { status: 'hydrating' } // checking a token found in localStorage on first load
  | { status: 'authenticated'; customer: Customer }
  | { status: 'error'; message: string };

export type AuthAction =
  | { type: 'hydrate_start' }
  | { type: 'session_established'; customer: Customer }
  | { type: 'session_failed'; message: string }
  | { type: 'logged_out' }
  // Dispatched after a wallet mutation (fund/transfer/withdraw) returns an
  // updated Customer, so the balance shown across the app stays correct
  // without a full profile refetch.
  | { type: 'customer_updated'; customer: Customer };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'hydrate_start':
      return { status: 'hydrating' };
    case 'session_established':
      return { status: 'authenticated', customer: action.customer };
    case 'session_failed':
      return { status: 'error', message: action.message };
    case 'logged_out':
      return { status: 'anonymous' };
    case 'customer_updated':
      // Type narrowing: only meaningful while authenticated; otherwise a
      // stray update (e.g. a race with logout) is a no-op rather than
      // fabricating an authenticated state from nothing.
      return state.status === 'authenticated' ? { ...state, customer: action.customer } : state;
    default:
      return assertNever(action);
  }
}

export const initialAuthState: AuthState = { status: 'anonymous' };
