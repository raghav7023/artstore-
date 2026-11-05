import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('artstore_token');
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || 'Failed to load user');
        setData(result);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading user details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-error">
        <p>❌ {error}</p>
        <Link to="/admin/users" className="back-link">← Back to Users</Link>
      </div>
    );
  }

  if (!data) return null;

  const { user = {}, orders = [], payments = [], emailLogs = [] } = data;

  return (
    <div className="admin-page">
      <Link to="/admin/users" className="back-link">← Back to Users</Link>
      
      <div className="detail-header">
        <div className="detail-avatar">👤</div>
        <div className="detail-info">
          <h2>{user.name || 'User'}</h2>
          <p className="detail-email">{user.email}</p>
          <p className="detail-phone">{user.phone || 'No phone provided'}</p>
          <div className="detail-meta">
            <span className={`role-badge ${user.role || 'user'}`}>{user.role || 'user'}</span>
            <span
              className={`status-badge ${user.status === 'inactive' ? 'status-cancelled' : 'status-delivered'}`}
            >
              {user.status || 'active'}
            </span>
            <span>Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}</span>
            <span>Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</span>
            <span>{user.totalOrders ?? orders.length} orders</span>
            <span>₹{(user.totalSpent || 0).toLocaleString('en-IN')} spent</span>
          </div>
          {user.role !== 'admin' && (
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="retry-btn"
                style={{
                  borderColor: user.status === 'inactive' ? '#10b981' : '#ef4444',
                  color: user.status === 'inactive' ? '#10b981' : '#ef4444',
                  padding: '6px 14px',
                }}
                onClick={async () => {
                  const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
                  const actionText = newStatus === 'active' ? 'Activate' : 'Deactivate';
                  const res = await Swal.fire({
                    title: `${actionText} Account?`,
                    text: `Are you sure you want to ${actionText.toLowerCase()} this account?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: `Yes, ${actionText}`,
                    confirmButtonColor: newStatus === 'active' ? '#10b981' : '#ef4444',
                  });
                  if (!res.isConfirmed) return;
                  try {
                    const token = localStorage.getItem('artstore_token');
                    const resp = await fetch(`${API_BASE_URL}/api/admin/users/${user._id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    const d = await resp.json();
                    if (!resp.ok || !d.success) throw new Error(d.message || 'Failed');
                    toast.success(d.message);
                    setData((prev) => ({ ...prev, user: { ...prev.user, status: newStatus } }));
                  } catch (err) {
                    toast.error(err.message);
                  }
                }}
              >
                {user.status === 'inactive' ? '🔓 Activate Account' : '🔒 Deactivate Account'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders ({orders.length})
        </button>
        <button
          className={activeTab === 'payments' ? 'active' : ''}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payments ({payments.length})
        </button>
        <button
          className={activeTab === 'emails' ? 'active' : ''}
          onClick={() => setActiveTab('emails')}
        >
          📧 Emails ({emailLogs.length})
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="admin-table-wrapper">
          {orders.length === 0 ? (
            <p className="admin-page-empty">No orders found.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td><code>#{order._id?.slice(-8)}</code></td>
                    <td className="items-cell">
                      {order.products?.map((p) => `${p.name} × ${p.quantity}`).join(', ') || '—'}
                    </td>
                    <td><strong>₹{(order.total || 0).toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <Link to={`/admin/orders/${order._id}`} className="view-btn">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="admin-table-wrapper">
          {payments.length === 0 ? (
            <p className="admin-page-empty">No payments found.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Razorpay Order ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td><code>{p.razorpay_order_id}</code></td>
                    <td><strong>₹{((p.amount || 0) / 100).toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span className={`status-badge status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="admin-table-wrapper">
          {emailLogs.length === 0 ? (
            <p className="admin-page-empty">No email logs found.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((e) => (
                  <tr key={e._id}>
                    <td>{e.subject}</td>
                    <td><span className="type-badge">{e.emailType?.replace(/_/g, ' ')}</span></td>
                    <td>
                      <span className={`status-badge status-${e.status}`}>
                        {e.status}
                      </span>
                    </td>
                    <td>{e.provider}</td>
                    <td>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
