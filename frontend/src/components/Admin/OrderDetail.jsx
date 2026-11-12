import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchOrder = async () => {
      try {
        setError('');
        const token = localStorage.getItem('artstore_token');
        const res = await fetch(`${API_BASE_URL}/api/admin/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load order');
        setOrder(data.order);
        setEmailLogs(data.emailLogs || []);
        setPayment(data.payment);
      } catch (err) {
        if (ignore) return;
        setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchOrder();
    return () => { ignore = true; };
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    const result = await Swal.fire({
      title: 'Update Order Status?',
      text: `Change status to "${newStatus}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update',
      confirmButtonColor: '#2f5bd3',
      cancelButtonColor: '#64748b',
    });
    if (!result.isConfirmed) return;

    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('artstore_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update status');
      setOrder(data.order);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="admin-loading-spinner"></div>
        <p>Loading order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-error">
        <p>❌ {error}</p>
        <Link to="/admin/orders" className="back-link">← Back</Link>
      </div>
    );
  }

  if (!order) return null;

  const statuses = [
    'Pending',
    'Processing',
    'Confirmed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
  ];
  const subtotal = order.products?.reduce(
    (sum, product) => sum + (Number(product.price) || 0) * (Number(product.quantity) || 0),
    0
  ) || 0;
  const delivery = Math.max(0, (Number(order.total) || 0) - subtotal);

  return (
    <div className="admin-page">
      <Link to="/admin/orders" className="back-link">← Back to Orders</Link>

      <div className="detail-header">
        <div>
          <h2>Order #{order._id?.slice(-8)}</h2>
          <p className="cell-subtext">Database ID: {order._id}</p>
        </div>
        <span className={`status-badge status-${order.status?.toLowerCase().replace(/ /g, '-')}`}>
          {order.status}
        </span>
      </div>

      {/* Status Update */}
      <div className="status-update-section">
        <label>Update Status:</label>
        <select
          className="admin-status-select"
          value={order.status || 'Pending'}
          disabled={updatingStatus}
          onChange={(event) => handleStatusUpdate(event.target.value)}
          aria-label="Update order status"
        >
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h3>Customer Information</h3>
          <div className="detail-fields">
            <div>
              <label>Name</label>
              <p><strong>{order.name}</strong></p>
            </div>
            <div>
              <label>Email</label>
              <p>{order.email}</p>
            </div>
            <div>
              <label>Phone</label>
              <p>{order.phone || '—'}</p>
            </div>
            <div>
              <label>Shipping Address</label>
              <p>{order.address}, {order.city}{order.state ? `, ${order.state}` : ''} - {order.pincode}</p>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Payment Information</h3>
          <div className="detail-fields">
            <div>
              <label>Method</label>
              <p>{order.payment || 'Razorpay'}</p>
            </div>
            <div>
              <label>Payment Status</label>
              <p>
                <span className={`status-badge status-${order.paymentStatus?.toLowerCase() || 'pending'}`}>
                  {order.paymentStatus || 'Pending'}
                </span>
              </p>
            </div>
            <div>
              <label>Total Amount</label>
              <p><strong>₹{(order.total || 0).toLocaleString('en-IN')}</strong></p>
            </div>
            {order.razorpay?.order_id && (
              <div>
                <label>Razorpay Order ID</label>
                <p><code>{order.razorpay.order_id}</code></p>
              </div>
            )}
            {order.razorpay?.payment_id && (
              <div>
                <label>Razorpay Payment ID</label>
                <p><code>{order.razorpay.payment_id}</code></p>
              </div>
            )}
            {payment && (
              <div>
                <label>Gateway Payment Status</label>
                <p>
                  <span className={`status-badge status-${payment.status}`}>
                    {payment.status}
                  </span>
                </p>
              </div>
            )}
            <div>
              <label>Order Date</label>
              <p>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Products</h3>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.products?.map((p, i) => (
                <tr key={i}>
                  <td className="order-detail-product">
                    <img src={p.image || '/artstore_logo.jpeg'} alt={p.name} />
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.quantity}</td>
                  <td>₹{(p.price || 0).toLocaleString('en-IN')}</td>
                  <td><strong>₹{((p.price || 0) * (p.quantity || 1)).toLocaleString('en-IN')}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="order-totals">
          <p><span>Subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></p>
          <p><span>Delivery</span><strong>₹{delivery.toLocaleString('en-IN')}</strong></p>
          <p className="order-final-total"><span>Final amount</span><strong>₹{(Number(order.total) || 0).toLocaleString('en-IN')}</strong></p>
        </div>
      </div>

      <div className="detail-section">
        <h3>Email Notifications</h3>
        <div className="detail-fields">
          <div>
            <label>Customer Confirmation Email</label>
            <p>{order.emailsSent?.customer ? '✅ Sent' : '❌ Not Sent'}</p>
          </div>
          <div>
            <label>Owner Notification Email</label>
            <p>{order.emailsSent?.owner ? '✅ Sent' : '❌ Not Sent'}</p>
          </div>
        </div>
        {emailLogs.length > 0 && (
          <div className="admin-table-wrapper" style={{ marginTop: '16px' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Error</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((e) => (
                  <tr key={e._id}>
                    <td>{e.recipient}</td>
                    <td><span className="type-badge">{e.emailType?.replace(/_/g, ' ')}</span></td>
                    <td>
                      <span className={`status-badge status-${e.status}`}>
                        {e.status}
                      </span>
                    </td>
                    <td>{e.provider}</td>
                    <td className="error-cell">{e.errorMessage || '—'}</td>
                    <td>{e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : '—'}</td>
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
