import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');
const ORDER_STATUSES = [
  'Pending',
  'Processing',
  'Confirmed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [updatingOrderId, setUpdatingOrderId] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(currentPage), limit: '20', sort: sortOrder });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('paymentStatus', paymentStatusFilter);

      const token = localStorage.getItem('artstore_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load orders.');
      }

      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, paymentStatusFilter, search, sortOrder, statusFilter]);

  useEffect(() => {
    const loadOrders = async () => {
      await fetchOrders();
    };
    loadOrders();
  }, [fetchOrders]);

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusUpdate = async (order, newStatus) => {
    if (newStatus === order.status) return;

    const confirmation = await Swal.fire({
      title: 'Update order status?',
      text: `Change this order to "${newStatus}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update',
      confirmButtonColor: '#2f5bd3',
      cancelButtonColor: '#64748b',
    });
    if (!confirmation.isConfirmed) return;

    try {
      setUpdatingOrderId(order._id);
      const token = localStorage.getItem('artstore_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${order._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update order status.');
      }

      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder._id === order._id
          ? { ...currentOrder, status: data.order.status }
          : currentOrder
      )));
      toast.success(`Order status updated to ${newStatus}.`);
      await fetchOrders();
    } catch (updateError) {
      toast.error(updateError.message || 'Failed to update order status.');
    } finally {
      setUpdatingOrderId('');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Order Management</h2>
          <p className="admin-page-subtitle">{pagination.total} total orders</p>
        </div>
      </div>

      <div className="admin-filters">
        <form className="admin-search-bar" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search by customer name or Order ID"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="Search orders by customer name or order ID"
          />
          <button type="submit">Search</button>
          {search && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setCurrentPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="order-filter-controls">
          <label>
            Order status
            <select value={statusFilter} onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Payment status
            <select value={paymentStatusFilter} onChange={(event) => {
              setPaymentStatusFilter(event.target.value);
              setCurrentPage(1);
            }}>
              <option value="">All payments</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
          <label>
            Sort by date
            <select value={sortOrder} onChange={(event) => {
              setSortOrder(event.target.value);
              setCurrentPage(1);
            }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>{error}</p>
          <button onClick={fetchOrders}>Retry</button>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-page-empty">
          <p>No orders found.</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table order-management-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Delivery address</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order date</th>
                  <th>Order status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="order-id-cell"><code>#{order._id}</code></td>
                    <td>
                      <strong>{order.name}</strong>
                      <a className="cell-subtext order-contact" href={`mailto:${order.email}`}>{order.email}</a>
                      <a className="cell-subtext order-contact" href={`tel:${order.phone}`}>{order.phone}</a>
                    </td>
                    <td className="order-address-cell">
                      {order.address}, {order.city}{order.state ? `, ${order.state}` : ''} {order.pincode}
                    </td>
                    <td>
                      <div className="order-items-cell">
                        {order.products?.map((product, index) => (
                          <div className="order-item" key={`${product.id || product.name}-${index}`}>
                            <img src={product.image || '/artstore_logo.jpeg'} alt={product.name} />
                            <span>
                              <strong>{product.name}</strong>
                              <small>Qty: {product.quantity} · ₹{Number(product.price || 0).toLocaleString('en-IN')} each</small>
                            </span>
                          </div>
                        )) || '—'}
                      </div>
                    </td>
                    <td><strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span className="payment-method-tag">{order.payment || 'Razorpay'}</span>
                      <span className={`status-badge status-${order.paymentStatus?.toLowerCase() || 'pending'}`}>
                        {order.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '—'}</td>
                    <td>
                      <select
                        className="admin-status-select"
                        value={order.status || 'Pending'}
                        disabled={Boolean(updatingOrderId)}
                        onChange={(event) => handleStatusUpdate(order, event.target.value)}
                        aria-label={`Update status for order ${order._id}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link to={`/admin/orders/${order._id}`} className="view-btn">View details</Link>
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
                onClick={() => setCurrentPage(pagination.page - 1)}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
