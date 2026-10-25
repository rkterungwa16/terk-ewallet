import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/format';
import { Icon, type IconName } from '../ui/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// Grouped by intent so the same kinds of task always live in the same place:
// look at money, move money, manage the account.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Overview', icon: 'dashboard', end: true },
      { to: '/transactions', label: 'Transactions', icon: 'receipt' },
    ],
  },
  {
    label: 'Move money',
    items: [
      { to: '/transfer', label: 'Transfer', icon: 'transfer' },
      { to: '/fund', label: 'Fund wallet', icon: 'plus' },
      { to: '/withdraw', label: 'Withdraw', icon: 'withdraw' },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/bank-accounts', label: 'Bank accounts', icon: 'bank' }],
  },
];

export function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const customer = auth.state.status === 'authenticated' ? auth.state.customer : undefined;
  const displayName = customer?.name ?? customer?.email ?? '';

  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close the mobile drawer and profile menu whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setNavOpen(false);
    setProfileOpen(false);
  }

  useEffect(() => {
    if (!navOpen && !profileOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
        setProfileOpen(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [navOpen, profileOpen]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    navigate(query ? `/transactions?q=${encodeURIComponent(query)}` : '/transactions');
  };

  return (
    <div className="layout">
      <header className="topbar">
        <button
          type="button"
          className="icon-button topbar__menu"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          onClick={() => {
            setProfileOpen(false);
            setNavOpen((open) => !open);
          }}
        >
          <Icon name={navOpen ? 'close' : 'menu'} />
        </button>

        <Link to="/" className="brand" aria-label="Wallet home">
          <span className="brand__mark">
            <Icon name="wallet" />
          </span>
          <span>Wallet</span>
        </Link>

        <div className="topbar__tools">
          <form className="topbar__search" role="search" onSubmit={handleSearch}>
            <label>
              <span className="sr-only">Search transactions</span>
              <Icon name="search" />
              <input name="q" type="search" placeholder="Search transactions…" />
            </label>
          </form>

          <div className="profile" ref={profileRef}>
            <button
              type="button"
              className="profile__button"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => {
                setNavOpen(false);
                setProfileOpen((open) => !open);
              }}
            >
              <span className="avatar" aria-hidden="true">
                {initials(displayName)}
              </span>
              <span className="profile__meta">
                <strong>{displayName}</strong>
                <span>Personal account</span>
              </span>
              <Icon name="chevron" className="profile__chevron" />
            </button>
            {profileOpen && customer && (
              <div className="profile__menu" role="menu">
                <div className="profile__menu-header">
                  <strong>{displayName}</strong>
                  <span>{customer.email}</span>
                  <span>Account {customer.accountNumber}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="profile__menu-item"
                  onClick={auth.logout}
                >
                  <Icon name="logout" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-shell">
        {navOpen && (
          <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setNavOpen(false)} />
        )}
        <aside
          id="app-sidebar"
          className={`sidebar${navOpen ? ' sidebar--open' : ''}`}
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map((group) => (
            <nav key={group.label} className="sidebar__group" aria-label={group.label}>
              <p className="sidebar__label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={item.label}
                  className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                >
                  <Icon name={item.icon} />
                  <span className="nav-link__label">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          ))}
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
