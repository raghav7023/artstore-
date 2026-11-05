import { useState, useEffect } from 'react';
import './Dashboard.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('artstore_token');
        const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load dashboard');
        setStats(data.stats);
        setCharts(data.charts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-error">
        <p>❌ {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers ?? 0, icon: '👥', color: '#3b82f6' },
    { label: 'Total Orders', value: stats.totalOrders ?? 0, icon: '📦', color: '#10b981' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: '💰', color: '#f59e0b' },
    { label: 'Products', value: stats.totalProducts ?? 0, icon: '🛍️', color: '#8b5cf6' },
    { label: 'Successful Payments', value: stats.totalSuccessfulPayments ?? 0, icon: '✅', color: '#10b981' },
    { label: 'Pending Payments', value: stats.totalPendingPayments ?? 0, icon: '⏳', color: '#f59e0b' },
    { label: 'Cancelled Orders', value: stats.totalCancelledOrders ?? 0, icon: '❌', color: '#ef4444' },
    { label: 'Emails Sent', value: stats.totalEmailsSent ?? 0, icon: '📧', color: '#06b6d4' },
    { label: 'Emails Failed', value: stats.totalEmailsFailed ?? 0, icon: '⚠️', color: '#ef4444' },
  ];

  // Simple bar chart using CSS
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueData = charts?.monthlyRevenue || [];
  const maxRevenue = Math.max(...revenueData.map(r => r.revenue), 1);

  return (
    <div className="dashboard">
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>{card.icon}</div>
            <div className="stat-info">
              <p className="stat-value">{card.value}</p>
              <p className="stat-label">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Monthly Revenue</h3>
          {revenueData.length === 0 ? (
            <p className="chart-empty">No revenue data available yet.</p>
          ) : (
            <div className="bar-chart">
              {revenueData.map((item, i) => (
                <div key={i} className="bar-item">
                  <div className="bar-fill" style={{ height: `${Math.max(8, (item.revenue / maxRevenue) * 100)}%` }}>
                    <span className="bar-tooltip">₹{item.revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="bar-label">{monthNames[(item._id.month || 1) - 1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chart-card">
          <h3>Order Status Distribution</h3>
          <div className="status-list">
            {Object.entries(stats.ordersByStatus || {}).map(([status, count]) => (
              <div key={status} className="status-row">
                <span className={`status-dot status-${status.toLowerCase()}`}></span>
                <span className="status-name">{status}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
            {Object.keys(stats.ordersByStatus || {}).length === 0 && (
              <p className="chart-empty">No orders yet.</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>New Registrations</h3>
          {(charts?.monthlyRegistrations || []).length === 0 ? (
            <p className="chart-empty">No registration data available yet.</p>
          ) : (
            <div className="registration-list">
              {(charts?.monthlyRegistrations || []).map((item, i) => (
                <div key={i} className="reg-row">
                  <span>{monthNames[(item._id.month || 1) - 1]} {item._id.year}</span>
                  <span className="reg-count">+{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
