import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Spinner } from './components/ui/Spinner';

/**
 * PERFORMANCE: React.lazy + Suspense for route-level code-splitting.
 *
 * Without this, every page's code — the dashboard, the transactions table,
 * every form — ships in the single JS bundle the browser must download and
 * parse before *anything* renders, even if the visitor only ever looks at
 * the dashboard. `lazy()` turns each page into its own chunk that Vite
 * builds separately and the browser only fetches the moment a route is
 * actually navigated to, which is exactly the kind of "not needed for the
 * first paint" work `Suspense` exists to let a component "wait" on: it
 * shows the fallback while the chunk downloads, then swaps to the real page
 * once the import resolves — no manual loading-state plumbing required.
 */
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const TransferPage = lazy(() => import('./pages/TransferPage'));
const FundPage = lazy(() => import('./pages/FundPage'));
const FundCallbackPage = lazy(() => import('./pages/FundCallbackPage'));
const WithdrawPage = lazy(() => import('./pages/WithdrawPage'));
const BankAccountsPage = lazy(() => import('./pages/BankAccountsPage'));

function withSuspense(element: React.ReactNode) {
  return (
    <Suspense
      fallback={(
        <div className="page-loading">
          <Spinner />
        </div>
      )}
    >
      {element}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/register', element: withSuspense(<RegisterPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withSuspense(<DashboardPage />) },
          { path: '/transactions', element: withSuspense(<TransactionsPage />) },
          { path: '/transfer', element: withSuspense(<TransferPage />) },
          { path: '/fund', element: withSuspense(<FundPage />) },
          { path: '/fund/callback', element: withSuspense(<FundCallbackPage />) },
          { path: '/withdraw', element: withSuspense(<WithdrawPage />) },
          { path: '/bank-accounts', element: withSuspense(<BankAccountsPage />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
