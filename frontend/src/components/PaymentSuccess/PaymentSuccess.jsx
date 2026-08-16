import React from 'react';
import { Link } from 'react-router-dom';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
  return (
    <div className="payment-success-page">
      <div className="payment-success-card">
        <div className="success-icon">🎉</div>
        <h1>Payment Successful</h1>
        <p>Your payment was processed successfully. Thank you for your order!</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
