import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { assertNever } from '../../types/async';
import { Spinner } from '../ui/Spinner';

/**
 * TYPE NARROWING via a switch over our discriminated union (AuthState).
 * Each branch below only compiles the way it does because TypeScript knows
 * exactly which variant it's in — `state.customer` is only accessible in
 * the 'authenticated' case, and trying to read it in 'anonymous' would be a
 * compile error, which is exactly the guarantee this union exists to give.
 */
export function ProtectedRoute() {
  const { state } = useAuth();
  const location = useLocation();

  switch (state.status) {
    case 'hydrating':
      return (
        <div className="page-loading">
          <Spinner label="Checking your session…" />
        </div>
      );
    case 'authenticated':
      return <Outlet />;
    case 'anonymous':
    case 'error':
      return <Navigate to="/login" replace state={{ from: location }} />;
    default:
      // Exhaustiveness check: every AuthState variant is handled above, so
      // `state` here has narrowed to `never`. Adding a 5th variant to
      // AuthState without a case for it here breaks the build.
      return assertNever(state);
  }
}
