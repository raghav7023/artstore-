import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function EmailList() {
  const [emails, setEmails] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [retrying, setRetrying] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const fetchEmails = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('artstore_token');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('emailType', typeFilter);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE_URL}/api/admin/emails?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load emails');
      setEmails(data.emails || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setError('');
        const token = localStorage.getItem('artstore_token');
        const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
        if (statusFilter) params.append('status', statusFilter);
        if (typeFilter) params.append('emailType', typeFilter);
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE_URL}/api/admin/emails?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load emails');
        setEmails(data.emails || []);
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
  }, [statusFilter, typeFilter, search, currentPage]);

  const handleRetry = async (emailId) => {
    const result = await Swal.fire({
      title: 'Retry Email Delivery?',
      text: 'This will attempt to resend the email using the active email service.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, retry',
      confirmButtonColor: '#2f5bd3',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;

    try {
      setRetrying(emailId);
      const token = localStorage.getItem('artstore_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/emails/${emailId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Retry failed');
      toast.success(data.message);
      fetchEmails(currentPage);
      if (selectedEmail && selectedEmail._id === emailId) {
        setSelectedEmail(data.emailLog);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRetrying(null);
    }
  };

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

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>📧 Email Delivery Management</h2>
          <p className="admin-page-subtitle">{pagination.total} total transactional email logs recorded</p>
        </div>
      </div>

      <div className="admin-filters">
        <form className="admin-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by recipient email, customer name, subject..."
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
          {['', 'sent', 'delivered', 'failed', 'pending', 'bounced'].map((s) => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
              onClick={() => {
                setLoading(true);
                setCurrentPage(1);
                setStatusFilter(s);
              }}
            >
              {s ? s.toUpperCase() : 'ALL STATUS'}
            </button>
          ))}
        </div>

        <div className="filter-pills">
          <span className="filter-label">Type:</span>
          {[
            '',
            'order_confirmation_customer',
            'order_confirmation_owner',
            'custom_order_customer',
            'custom_order_owner',
          ].map((t) => (
            <button
              key={t}
              className={`filter-pill ${typeFilter === t ? 'active' : ''}`}
              onClick={() => {
                setLoading(true);
                setCurrentPage(1);
                setTypeFilter(t);
              }}
            >
              {t ? t.replace(/_/g, ' ') : 'ALL TYPES'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading emails...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>❌ {error}</p>
          <button onClick={() => fetchEmails(currentPage)}>Retry</button>
        </div>
      ) : emails.length === 0 ? (
        <div className="admin-page-empty">
          <p>No email logs found matching filters.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Attempts</th>
                  <th>Error Reason</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email._id}>
                    <td>
                      <strong>{email.recipientName || '—'}</strong><br />
                      <small className="cell-subtext">{email.recipient}</small>
                    </td>
                    <td className="subject-cell">{email.subject}</td>
                    <td>
                      <span className="type-badge">{email.emailType?.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${email.status}`}>
                        {email.status}
                      </span>
                    </td>
                    <td>
                      <code>{email.provider}</code>
                    </td>
                    <td>{email.attemptCount} / {email.maxAttempts}</td>
                    <td className="error-cell">{email.errorMessage || '—'}</td>
                    <td>
                      <small>{email.createdAt ? new Date(email.createdAt).toLocaleString('en-IN') : '—'}</small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="view-btn"
                          onClick={() => setSelectedEmail(email)}
                        >
                          View
                        </button>
                        {(email.status === 'failed' || email.status === 'pending') && email.attemptCount < email.maxAttempts && (
                          <button
                            type="button"
                            className="retry-btn"
                            disabled={retrying === email._id}
                            onClick={() => handleRetry(email._id)}
                          >
                            {retrying === email._id ? '⏳' : '🔄'} Retry
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

      {/* Email Details Modal */}
      {selectedEmail && (
        <div className="admin-modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>📧 Email Log Details</h3>
              <button className="admin-modal-close" onClick={() => setSelectedEmail(null)}>✕</button>
            </div>
            <div className="detail-fields" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label>Recipient</label>
                <p><strong>{selectedEmail.recipientName}</strong> &lt;{selectedEmail.recipient}&gt;</p>
              </div>
              <div>
                <label>Status</label>
                <p>
                  <span className={`status-badge status-${selectedEmail.status}`}>
                    {selectedEmail.status}
                  </span>
                </p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Subject</label>
                <p><strong>{selectedEmail.subject}</strong></p>
              </div>
              <div>
                <label>Email Type</label>
                <p><span className="type-badge">{selectedEmail.emailType}</span></p>
              </div>
              <div>
                <label>Provider</label>
                <p><code>{selectedEmail.provider}</code></p>
              </div>
              <div>
                <label>Provider Message ID</label>
                <p><code>{selectedEmail.providerMessageId || 'None'}</code></p>
              </div>
              <div>
                <label>Attempts</label>
                <p>{selectedEmail.attemptCount} of {selectedEmail.maxAttempts}</p>
              </div>
              <div>
                <label>Created Timestamp</label>
                <p>{new Date(selectedEmail.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label>Last Attempt Timestamp</label>
                <p>{selectedEmail.lastAttemptAt ? new Date(selectedEmail.lastAttemptAt).toLocaleString('en-IN') : 'N/A'}</p>
              </div>
              {selectedEmail.relatedOrder && (
                <div>
                  <label>Linked Order</label>
                  <p><a href={`/admin/orders/${selectedEmail.relatedOrder}`}>#{String(selectedEmail.relatedOrder).slice(-8)}</a></p>
                </div>
              )}
              {selectedEmail.errorMessage && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label>Error Reason / Failure Message</label>
                  <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                    ⚠️ {selectedEmail.errorMessage}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {(selectedEmail.status === 'failed' || selectedEmail.status === 'pending') && selectedEmail.attemptCount < selectedEmail.maxAttempts && (
                <button
                  type="button"
                  className="retry-btn"
                  disabled={retrying === selectedEmail._id}
                  onClick={() => handleRetry(selectedEmail._id)}
                  style={{ padding: '8px 16px' }}
                >
                  {retrying === selectedEmail._id ? '⏳ Retrying...' : '🔄 Retry Email Delivery'}
                </button>
              )}
              <button
                type="button"
                className="view-btn"
                onClick={() => setSelectedEmail(null)}
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
