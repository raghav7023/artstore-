import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('artstore_token');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      
      const res = await fetch(`${API_BASE_URL}/api/admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load payments');
      setPayments(data.payments || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { 
    let ignore = false;
    const load = async () => {
      try {
        setError('');
        const token = localStorage.getItem('artstore_token');
        const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
        if (statusFilter) params.append('status', statusFilter);
        if (search) params.append('search', search);
        
        const res = await fetch(`${API_BASE_URL}/api/admin/payments?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load payments');
        setPayments(data.payments || []);
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
  }, [statusFilter, search, currentPage]);

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
          <h2>💳 Payment Management</h2>
          <p className="admin-page-subtitle">{pagination.total} total payments</p>
        </div>
      </div>

      <div className="admin-filters">
        <form className="admin-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by customer name, email, or Razorpay ID..."
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
          {['', 'created', 'paid', 'failed'].map((s) => (
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
          <p>Loading payments...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>❌ {error}</p>
          <button onClick={() => fetchPayments(currentPage)}>Retry</button>
        </div>
      ) : payments.length === 0 ? (
        <div className="admin-page-empty">
          <p>No payments found.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Razorpay Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Linked Order</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td><code>{p.razorpay_order_id}</code></td>
                    <td>
                      <strong>{p.customer?.name || '—'}</strong><br />
                      <small className="cell-subtext">{p.customer?.email || ''}</small>
                    </td>
                    <td><strong>₹{((p.amount || 0) / 100).toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span className={`status-badge status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.linkedOrder ? (
                        <Link to={`/admin/orders/${p.linkedOrder._id}`} className="linked-order-link">
                          #{p.linkedOrder._id?.slice(-8)}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}</td>
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
