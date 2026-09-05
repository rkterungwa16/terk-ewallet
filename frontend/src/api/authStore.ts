/**
 * WHY THIS EXISTS / WHY useSyncExternalStore (see hooks/useAuthToken.ts):
 *
 * The access token's real source of truth is `localStorage`, which lives
 * outside React entirely. If we modeled it as plain `useState` in a
 * context provider, two problems show up:
 *
 *   1. Logging in on one browser tab wouldn't update the auth state of a
 *      second open tab, since each tab would have its own independent
 *      `useState`.
 *   2. `apiFetch` (a plain function, not a component) also needs to read
 *      the current token on every request — reading it from React state
 *      would mean threading it through as an argument everywhere, or
 *      reading a stale closure.
 *
 * `useSyncExternalStore` is the hook React 18+ ships specifically for
 * "there's a mutable value that lives outside React — subscribe a
 * component to it and always read the current value, even under
 * concurrent rendering". This module is the external store itself: a
 * subscribe function and a snapshot getter, framework-agnostic, that both
 * `apiFetch` and the `useAuthToken` hook read from.
 */

const STORAGE_KEY = 'wallet.accessToken';

type Listener = () => void;
const listeners = new Set<Listener>();

function readFromStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private-browsing modes in some browsers.
    return null;
  }
}

let cachedToken: string | null = readFromStorage();

function emitChange(): void {
  for (const listener of listeners) listener();
}

// Cross-tab sync: fires in *other* tabs when localStorage changes, but
// never in the tab that made the change — hence also needing emitChange()
// to be called directly from setToken() below for same-tab updates.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    cachedToken = event.newValue;
    emitChange();
  }
});

export const authStore = {
  /** Required shape for useSyncExternalStore's `subscribe` argument. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Required shape for useSyncExternalStore's `getSnapshot` argument. */
  getSnapshot(): string | null {
    return cachedToken;
  },

  setToken(token: string): void {
    cachedToken = token;
    window.localStorage.setItem(STORAGE_KEY, token);
    emitChange();
  },

  clearToken(): void {
    cachedToken = null;
    window.localStorage.removeItem(STORAGE_KEY);
    emitChange();
  },
};
