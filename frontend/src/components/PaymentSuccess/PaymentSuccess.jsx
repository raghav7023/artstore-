import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
  const location = useLocation();
  const order = location.state?.order;

  return (
    <div className="payment-success-page">
      <Navbar />
      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="success-icon">🎉</div>
          <h1>Order Confirmed!</h1>
          <p className="success-subtitle">
            Your payment was processed successfully. We've received your order and are packing it with love!
          </p>

          {order ? (
            <div className="order-details-box">
              <div className="order-meta-grid">
                <div>
                  <span className="meta-label">Order ID</span>
                  <strong>#{order._id || order.id}</strong>
                </div>
                <div>
                  <span className="meta-label">Amount Paid</span>
                  <strong className="amount-highlight">₹{order.total}</strong>
                </div>
                <div>
                  <span className="meta-label">Payment Status</span>
                  <span className="badge-paid">Paid (Razorpay)</span>
                </div>
                {order.razorpay?.payment_id && (
                  <div>
                    <span className="meta-label">Payment ID</span>
                    <small>{order.razorpay.payment_id}</small>
                  </div>
                )}
              </div>

              <div className="order-shipping-summary">
                <h4>Delivery Details</h4>
                <p>
                  <strong>{order.name}</strong> • {order.phone}<br />
                  {order.address}, {order.city} - {order.pincode}
                </p>
              </div>

              {order.products && order.products.length > 0 && (
                <div className="order-items-summary">
                  <h4>Items Ordered ({order.products.length})</h4>
                  <div className="items-list">
                    {order.products.map((item, idx) => (
                      <div className="success-item-row" key={idx}>
                        {item.image && <img src={item.image} alt={item.name} className="success-item-thumb" />}
                        <div className="success-item-info">
                          <span className="success-item-name">{item.name}</span>
                          <span className="success-item-qty">Qty: {item.quantity} × ₹{item.price}</span>
                        </div>
                        <span className="success-item-total">₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="email-confirmation-note">
                ✉️ An order confirmation email has been sent to <strong>{order.email}</strong>.
              </p>
            </div>
          ) : (
            <div className="order-fallback-box">
              <p>Your payment has been successfully recorded. You can review all your purchases in your orders dashboard.</p>
            </div>
          )}

          <div className="success-actions">
            <Link to="/order" className="btn-primary">
              📦 View My Orders
            </Link>
            <Link to="/products" className="btn-secondary">
              🛍️ Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
