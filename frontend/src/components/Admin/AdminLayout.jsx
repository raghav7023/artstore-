import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

const sidebarItems = [
  { path: '/admin', label: 'Overview', icon: '📊', exact: true },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/products', label: 'Products', icon: '🛍️' },
  { path: '/admin/orders', label: 'Orders', icon: '📦' },
  { path: '/admin/payments', label: 'Payments', icon: '💳' },
  { path: '/admin/emails', label: 'Email Management', icon: '📧' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authRetry, setAuthRetry] = useState(0);
  const requestedPath = useRef(`${location.pathname}${location.search}${location.hash}`);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('artstore_token');
      if (!token) {
        navigate('/signin', {
          replace: true,
          state: { from: requestedPath.current },
        });
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);

        if (res.status === 401 || res.status === 404) {
          localStorage.removeItem('artstore_token');
          localStorage.removeItem('artstore_user');
          navigate('/signin', {
            replace: true,
            state: { from: requestedPath.current },
          });
          return;
        }

        if (!res.ok || !data?.success || !data.user) {
          throw new Error(data?.message || 'Unable to verify admin access.');
        }

        if (data.user.role !== 'admin') {
          navigate('/', { replace: true });
          return;
        }

        setUser(data.user);
        localStorage.setItem('artstore_user', JSON.stringify(data.user));
        setAuthChecked(true);
      } catch (error) {
        setAuthError(error.message || 'Unable to verify admin access. Please try again.');
      }
    };
    checkAuth();
  }, [navigate, authRetry]);

  const handleLogout = () => {
    localStorage.removeItem('artstore_token');
    localStorage.removeItem('artstore_user');
    navigate('/');
  };

  if (!authChecked) {
    return (
      <div className="admin-loading">
        {!authError && <div className="admin-loading-spinner"></div>}
        {authError ? (
          <>
            <p role="alert">{authError}</p>
            <button onClick={() => {
              setAuthError('');
              setAuthRetry((retry) => retry + 1);
            }}>
              Try again
            </button>
          </>
        ) : (
          <p>Verifying admin access...</p>
        )}
      </div>
    );
  }

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-logo">
            <span className="admin-logo-icon">🎨</span>
            <span className="admin-logo-text">Art Store</span>
          </Link>
          <span className="admin-badge">Admin</span>
        </div>

        <nav className="admin-nav">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-avatar">👤</span>
            <div>
              <p className="admin-user-name">{user?.name || 'Admin'}</p>
              <p className="admin-user-email">{user?.email || ''}</p>
            </div>
          </div>
          <div className="admin-footer-actions">
            <Link to="/" className="admin-footer-btn">🏠 Store</Link>
            <button onClick={handleLogout} className="admin-footer-btn logout">🚪 Logout</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1 className="admin-page-title">
            {sidebarItems.find(i => isActive(i))?.label || 'Admin'}
          </h1>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
