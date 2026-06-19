// ==========================================
// Order.jsx — Order / Checkout Page
// ==========================================

import React, { useState } from 'react';
import Navbar from '../Navbar/Navbar.jsx';
import './Order.css';

export default function Order() {

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });

  // Payment method state
  const [payment, setPayment] = useState('cod');

  // Success message state
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Input change handler
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Form submit
  const handleSubmit = (e) => {
    e.preventDefault(); // Page reload mat karo
    setOrderPlaced(true); // Success show karo
  };

  return (
    <div className="order-page">

      {/* Navbar */}
      <Navbar />

      {/* Header */}
      <div className="order-header">
        <h1>📦 Place Your Order</h1>
        <p>Fill in your details and we'll deliver to your door</p>
      </div>

      {/* Agar order place ho gaya */}
      {orderPlaced ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--text)', marginBottom: '10px' }}>
            Order Placed Successfully!
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Thank you for your order. We'll deliver it soon! 🧶
          </p>
        </div>
      ) : (
        <div className="order-content">

          {/* LEFT: Form */}
          <div className="order-form-box">
            <h2>📋 Delivery Details</h2>

            <form className="order-form" onSubmit={handleSubmit}>

              {/* Name */}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  required
                />
              </div>

              {/* Address */}
              <div className="form-group">
                <label>Full Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House no., Street, Area..."
                  required
                />
              </div>

              {/* City */}
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  required
                />
              </div>

              {/* Pincode */}
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-options">

                  <div
                    className={payment === 'cod' ? 'payment-option selected' : 'payment-option'}
                    onClick={() => setPayment('cod')}
                  >
                    <span className="pay-icon">💵</span>
                    <span>Cash on Delivery</span>
                  </div>

                  <div
                    className={payment === 'upi' ? 'payment-option selected' : 'payment-option'}
                    onClick={() => setPayment('upi')}
                  >
                    <span className="pay-icon">📱</span>
                    <span>UPI</span>
                  </div>

                  <div
                    className={payment === 'card' ? 'payment-option selected' : 'payment-option'}
                    onClick={() => setPayment('card')}
                  >
                    <span className="pay-icon">💳</span>
                    <span>Card</span>
                  </div>

                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="place-order-btn">
                🎁 Place Order
              </button>

            </form>
          </div>

          {/* RIGHT: Summary */}
          <div className="order-summary-box">
            <h2>Order Summary</h2>

            {/* Item */}
            <div className="summary-item">
              <span>Sunflower Bouquet × 1</span>
              <span>₹299</span>
            </div>
            <div className="summary-item">
              <span>Rabbit Keychain × 2</span>
              <span>₹398</span>
            </div>
            <div className="summary-item">
              <span>Delivery</span>
              <span>₹50</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>₹747</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
