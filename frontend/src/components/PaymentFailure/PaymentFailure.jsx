import React from 'react';
import { Link } from 'react-router-dom';
import './PaymentFailure.css';

export default function PaymentFailure() {
  return (
    <div className="payment-failure-page">
      <div className="payment-failure-card">
        <div className="failure-icon">⚠️</div>
        <h1>Payment Failed</h1>
        <p>We couldn't process your payment. Please try again or contact support.</p>
        <Link to="/checkout" className="btn-primary">Try Again</Link>
      </div>
    </div>
  );
}
