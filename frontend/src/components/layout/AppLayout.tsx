import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
  { to: '/transfer', label: 'Transfer', end: false },
  { to: '/fund', label: 'Fund wallet', end: false },
  { to: '/withdraw', label: 'Withdraw', end: false },
  { to: '/bank-accounts', label: 'Bank accounts', end: false },
];

export function AppLayout() {
  const auth = useAuth();
  const customer = auth.state.status === 'authenticated' ? auth.state.customer : undefined;

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">Wallet</div>
        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-shell__footer">
          {customer && <p className="app-shell__account">{customer.email}</p>}
          <button type="button" className="app-shell__logout" onClick={auth.logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
