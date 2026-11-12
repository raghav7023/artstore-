import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const token = localStorage.getItem('artstore_token');
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load users');
      setUsers(data.users || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setError('');
        const token = localStorage.getItem('artstore_token');
        const params = new URLSearchParams({ page: currentPage, limit: 20 });
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load users');
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch (err) {
        if (ignore) return;
        setError(err.message);
        toast.error(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [search, currentPage]);

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

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    const actionText = newStatus === 'active' ? 'Activate' : 'Deactivate';

    const result = await Swal.fire({
      title: `${actionText} User Account?`,
      text: `Are you sure you want to ${actionText.toLowerCase()} account for "${user.name}" (${user.email})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`,
      confirmButtonColor: newStatus === 'active' ? '#10b981' : '#ef4444',
    });

    if (!result.isConfirmed) return;

    try {
      setUpdatingId(user._id);
      const token = localStorage.getItem('artstore_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${user._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update user status');

      toast.success(data.message);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>👥 User Management</h2>
          <p className="admin-page-subtitle">{pagination.total} registered users</p>
        </div>
      </div>

      <form className="admin-search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or ID..."
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

      {loading ? (
        <div className="admin-page-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>❌ {error}</p>
          <button onClick={() => fetchUsers(currentPage)}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-page-empty">
          <p>No users found.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Orders</th>
                  <th>Spent</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span className={`role-badge ${user.role || 'user'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${user.status === 'inactive' ? 'status-cancelled' : 'status-delivered'}`}
                      >
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td>{user.totalOrders ?? 0}</td>
                    <td>₹{(user.totalSpent || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <small>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                      </small>
                    </td>
                    <td>
                      <small>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}
                      </small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link to={`/admin/users/${user._id}`} className="view-btn">
                          View
                        </Link>
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            className="retry-btn"
                            style={{
                              borderColor: user.status === 'inactive' ? '#10b981' : '#ef4444',
                              color: user.status === 'inactive' ? '#10b981' : '#ef4444',
                            }}
                            disabled={updatingId === user._id}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'inactive' ? 'Activate' : 'Deactivate'}
                          </button>
                        )}
                      </div>
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
