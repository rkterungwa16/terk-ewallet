import { useSyncExternalStore } from 'react';
import { authStore } from '../api/authStore';

/**
 * EXACT REACT API FOR THE JOB: useSyncExternalStore.
 *
 * It would be *possible* to fake this with useState + useEffect (subscribe
 * in the effect, setState in the listener), but that reimplementation has
 * two real bugs useSyncExternalStore exists to avoid:
 *
 *   1. Under React 18's concurrent rendering, a component can start
 *      rendering, yield, and resume later. A useState+useEffect version can
 *      render with one snapshot of the token and commit with a different
 *      one if the external store changed in between ("tearing"). This hook
 *      subscribes and reads the snapshot in a way React's scheduler
 *      understands, so the value is always consistent within a single
 *      render.
 *   2. It also just IS the token's source of truth (localStorage) — no
 *      duplicate copy to keep in sync.
 *
 * This is the textbook use case the hook's documentation gives: bridging a
 * store that lives outside React (here, `authStore`, backed by
 * localStorage) into a component.
 */
export function useAuthToken(): string | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
