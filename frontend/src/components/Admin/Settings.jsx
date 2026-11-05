import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function Settings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('artstore_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to load system settings');
      setData(result.settings);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading system configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-error">
        <p>❌ {error}</p>
        <button onClick={fetchSettings}>Retry</button>
      </div>
    );
  }

  const { emailService, paymentGateway, system, recentAuditLogs } = data || {};

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>⚙️ System Settings & Diagnostics</h2>
          <p className="admin-page-subtitle">Real-time infrastructure health and configuration audit</p>
        </div>
        <button className="view-btn" onClick={fetchSettings} style={{ padding: '8px 16px' }}>
          🔄 Refresh Status
        </button>
      </div>

      <div className="detail-grid" style={{ marginBottom: '24px' }}>
        {/* Email Diagnostics Card */}
        <div className="detail-section">
          <h3>📧 Email Service Diagnostics</h3>
          <div className="detail-fields">
            <div>
              <label>Primary Provider</label>
              <p>
                <strong>{emailService?.provider}</strong>
              </p>
            </div>
            <div>
              <label>Resend API Configured</label>
              <p>{emailService?.resendConfigured ? '✅ Active' : '❌ Not configured'}</p>
            </div>
            <div>
              <label>Sender Address (FROM)</label>
              <p>
                <code>{emailService?.resendFrom}</code>
              </p>
            </div>
            <div>
              <label>Domain Verification Status</label>
              <p style={{ color: emailService?.isSandbox ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                {emailService?.isSandbox ? '⚠️ Resend Sandbox Mode' : `🌐 Domain: ${emailService?.senderDomain || 'Custom'}`}
              </p>
            </div>
            <div>
              <label>Gmail SMTP Fallback</label>
              <p>{emailService?.smtpFallbackConfigured ? '✅ Active' : '❌ Not configured'}</p>
            </div>
            <div>
              <label>Store Owner Alert Email</label>
              <p>
                <code>{emailService?.ownerNotificationEmail}</code>
              </p>
            </div>
          </div>
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: emailService?.isSandbox ? '#fffbeb' : '#f0fdf4',
              borderRadius: '8px',
              border: `1px solid ${emailService?.isSandbox ? '#fde68a' : '#bbf7d0'}`,
              fontSize: '0.88rem',
              color: emailService?.isSandbox ? '#92400e' : '#166534',
            }}
          >
            ℹ️ {emailService?.resendDomainVerifiedNotice}
          </div>
        </div>

        {/* Payment & System Diagnostics */}
        <div className="detail-section">
          <h3>💳 Payment & Server Diagnostics</h3>
          <div className="detail-fields">
            <div>
              <label>Razorpay Gateway</label>
              <p>{paymentGateway?.configured ? '✅ Connected' : '❌ Not configured'}</p>
            </div>
            <div>
              <label>Gateway Mode</label>
              <p>
                <span
                  className="role-badge"
                  style={{
                    background: paymentGateway?.mode?.includes('Live') ? '#dcfce7' : '#fef3c7',
                    color: paymentGateway?.mode?.includes('Live') ? '#15803d' : '#b45309',
                  }}
                >
                  {paymentGateway?.mode}
                </span>
              </p>
            </div>
            <div>
              <label>Key ID</label>
              <p>
                <code>{paymentGateway?.keyIdPrefix}</code>
              </p>
            </div>
            <div>
              <label>Database State</label>
              <p style={{ color: '#10b981', fontWeight: 600 }}>✅ {system?.databaseState}</p>
            </div>
            <div>
              <label>Environment</label>
              <p>
                <code>{system?.environment}</code>
              </p>
            </div>
            <div>
              <label>Node.js Runtime</label>
              <p>
                <code>{system?.nodeVersion}</code>
              </p>
            </div>
            <div>
              <label>Server Uptime</label>
              <p>{Math.floor((system?.uptimeSeconds || 0) / 60)} minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Admin Audit Logs */}
      <div className="detail-section">
        <h3>📋 Recent Admin Audit Logs</h3>
        <p className="admin-page-subtitle" style={{ marginBottom: '16px' }}>
          Immutable log of administrative operations performed on Artstore
        </p>

        {recentAuditLogs?.length === 0 ? (
          <p className="admin-page-empty">No admin actions recorded yet.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentAuditLogs?.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className="type-badge">{log.action?.replace(/_/g, ' ')}</span>
                    </td>
                    <td>
                      <strong>{log.performedBy?.name || 'Admin'}</strong>
                      <br />
                      <small>{log.performedBy?.email}</small>
                    </td>
                    <td>
                      <span className="role-badge" style={{ textTransform: 'capitalize' }}>
                        {log.targetType}
                      </span>
                    </td>
                    <td>
                      <code>#{log.targetId?.slice(-8) || log.targetId || '—'}</code>
                    </td>
                    <td style={{ maxWidth: '200px', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td>{log.ipAddress || '—'}</td>
                    <td>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
