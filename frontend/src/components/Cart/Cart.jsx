// ==========================================
// Cart.jsx — Shopping Cart Page
// ==========================================

import React, { useState } from 'react';
import Navbar from '../Navbar/Navbar.jsx';
import './Cart.css';

// Sample cart items — baad mein state management se aayega
const initialItems = [
  { id: 1, name: 'Sunflower Bouquet',  price: 299, image: '/sunflower.jpeg', quantity: 1 },
  { id: 2, name: 'Rabbit Keychain',    price: 199, image: '/rabbit.jpeg',    quantity: 2 },
];

export default function Cart() {

  // cartItems = current cart state
  const [cartItems, setCartItems] = useState(initialItems);

  // Quantity badhao
  const increase = (id) => {
    setCartItems(cartItems.map(item =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  // Quantity ghatao (minimum 1)
  const decrease = (id) => {
    setCartItems(cartItems.map(item =>
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ));
  };

  // Item remove karo
  const remove = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // Total price calculate karo
  // reduce() = Array ko ek value mein convert karo
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal > 0 ? 50 : 0;
  const total    = subtotal + delivery;

  return (
    <div className="cart-page">

      {/* Navbar */}
      <Navbar />

      {/* Header */}
      <div className="cart-header">
        <h1>🛒 Your Cart</h1>
        <p>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart</p>
      </div>

      {/* Cart Content */}
      <div className="cart-content">

        {/* LEFT: Items */}
        <div className="cart-items">

          {/* Agar cart empty hai */}
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <span className="empty-icon">🛒</span>
              <h2>🧺 Oops! Your cart is feeling lonely</h2>
              <p>Add some beautiful handmade products!</p>
            </div>
          ) : (
            // Agar items hain toh dikhao
            cartItems.map((item) => (
              <div className="cart-item" key={item.id}>

                {/* Product Image */}
                <img src={item.image} alt={item.name} />

                {/* Product Details */}
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">₹{item.price}</p>

                  {/* Quantity Controls */}
                  <div className="quantity">
                    <button className="qty-btn" onClick={() => decrease(item.id)}>−</button>
                    <span className="qty-count">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => increase(item.id)}>+</button>
                  </div>
                </div>

                {/* Remove Button */}
                <button className="remove-btn" onClick={() => remove(item.id)}>
                  Remove
                </button>

              </div>
            ))
          )}
        </div>

        {/* RIGHT: Summary */}
        <div className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="summary-row">
            <span>Delivery</span>
            <span>{delivery === 0 ? 'Free' : `₹${delivery}`}</span>
          </div>

          <div className="summary-row total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

          <button className="checkout-btn" disabled={cartItems.length === 0}>
            Proceed to Checkout →
          </button>
        </div>

      </div>
    </div>
  );
}
