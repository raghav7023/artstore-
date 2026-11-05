import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('artstore_token');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`${API_BASE_URL}/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load orders');
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setError('');
        const token = localStorage.getItem('artstore_token');
        const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
        if (search) params.append('search', search);
        if (statusFilter) params.append('status', statusFilter);

        const res = await fetch(`${API_BASE_URL}/api/admin/orders?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load orders');
        setOrders(data.orders || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        if (ignore) return;
        setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [search, statusFilter, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setLoading(true);
    setSearch('');
    setSearchInput('');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (newStatus) => {
    setLoading(true);
    setCurrentPage(1);
    setStatusFilter(newStatus);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>📦 Order Management</h2>
          <p className="admin-page-subtitle">{pagination.total} total orders</p>
        </div>
      </div>

      <div className="admin-filters">
        <form className="admin-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by customer name, email, phone, or order ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit">🔍 Search</button>
          {search && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClear}
            >
              ✕ Clear
            </button>
          )}
        </form>
        <div className="filter-pills">
          <span className="filter-label">Status:</span>
          {['', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => handleStatusFilterChange(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>❌ {error}</p>
          <button onClick={() => fetchOrders(currentPage)}>Retry</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-page-empty">
          <p>No orders found.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td><code>#{order._id?.slice(-8)}</code></td>
                    <td>
                      <strong>{order.name}</strong><br />
                      <small className="cell-subtext">{order.email}</small>
                    </td>
                    <td className="items-cell">
                      {order.products?.map((p) => `${p.name} × ${p.quantity}`).join(', ') || '—'}
                    </td>
                    <td><strong>₹{(order.total || 0).toLocaleString('en-IN')}</strong></td>
                    <td><span className="payment-method-tag">{order.payment || 'Razorpay'}</span></td>
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
          </div>

          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  setLoading(true);
                  setCurrentPage(pagination.page - 1);
                }}
              >
                ← Prev
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setCurrentPage(pagination.page + 1);
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
