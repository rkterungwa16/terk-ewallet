import {
  createContext, useCallback, useEffect, useMemo, useReducer, type ReactNode,
} from 'react';
import {
  authApi, customerApi, type LoginPayload, type RegisterPayload,
} from '../api/endpoints';
import { authStore } from '../api/authStore';
import { useAuthToken } from '../hooks/useAuthToken';
import { authReducer, initialAuthState, type AuthState } from './authReducer';
import type { Customer } from '../types/domain';

interface AuthContextValue {
  state: AuthState;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateCustomer: (customer: Customer) => void;
}

// `undefined` default forces every consumer through the `useAuth` hook
// below, which throws a clear error instead of a confusing "customer is
// undefined" crash if someone forgets to render <AuthProvider>.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const token = useAuthToken();

  // SYNCHRONIZATION WITH AN EXTERNAL SYSTEM (the token store / network) is
  // exactly what useEffect is for: whenever the token changes — on first
  // load if one was already in localStorage, or after login/logout in
  // another tab via useSyncExternalStore — re-derive who's logged in by
  // asking the API who this token belongs to.
  useEffect(() => {
    if (!token) {
      dispatch({ type: 'logged_out' });
      return;
    }

    const controller = new AbortController();
    dispatch({ type: 'hydrate_start' });

    customerApi
      .me(controller.signal)
      .then((customer) => dispatch({ type: 'session_established', customer }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        authStore.clearToken();
        dispatch({ type: 'session_failed', message: err instanceof Error ? err.message : 'Session expired' });
      });

    return () => controller.abort();
  }, [token]);

  // useCallback: these three functions are handed to <AuthProvider>'s
  // context value and, from there, into form components that call them
  // from inside a useActionState action. Giving them stable identities
  // means those forms' effects/memoized callbacks that depend on
  // `login`/`register`/`logout` don't re-run just because AuthProvider
  // re-rendered for an unrelated reason (e.g. `state` changing).
  const login = useCallback(async (payload: LoginPayload) => {
    const { customer, token: authToken } = await authApi.login(payload);
    authStore.setToken(authToken.accessToken);
    dispatch({ type: 'session_established', customer });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { customer, token: authToken } = await authApi.register(payload);
    authStore.setToken(authToken.accessToken);
    dispatch({ type: 'session_established', customer });
  }, []);

  const logout = useCallback(() => {
    authStore.clearToken();
    dispatch({ type: 'logged_out' });
  }, []);

  const updateCustomer = useCallback((customer: Customer) => {
    dispatch({ type: 'customer_updated', customer });
  }, []);

  // PERFORMANCE: memoize the context value object itself. Context
  // consumers re-render whenever the value they read *changes identity*
  // (React compares with Object.is), even if the fields they actually use
  // are unchanged. Without useMemo, every render of AuthProvider — which
  // happens on every dispatch, including ones unrelated to a given
  // consumer's needs — would hand out a brand-new `{ state, login,
  // register, logout }` object and force every consumer to re-render.
  // Memoizing means consumers only re-render when `state` (the one part
  // that actually changes over time) changes.
  const value = useMemo<AuthContextValue>(
    () => ({
      state, login, register, logout, updateCustomer,
    }),
    [state, login, register, logout, updateCustomer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
