import React, { useState } from 'react';
import Navbar from '../Navbar/Navbar.jsx';
import './Cart.css';
import { useNavigate } from "react-router-dom";
export default function Cart() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState(() => {
    return JSON.parse(localStorage.getItem("cart")) || [];
  });

  // Increase Quantity
  const increase = (id) => {

    const updated = cartItems.map(item =>
      item.id === id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );

    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  // Decrease Quantity
  const decrease = (id) => {

    const updated = cartItems.map(item =>
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item
    );

    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  // Remove Item
  const remove = (id) => {

    const updated = cartItems.filter(item => item.id !== id);

    setCartItems(updated);

    localStorage.setItem("cart", JSON.stringify(updated));
  };

  // Total
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const delivery = subtotal > 0 ? 50 : 0;

  const total = subtotal + delivery;

  return (
    <div className="cart-page">

      <Navbar />

      <div className="cart-header">
        <h1>🛒 Your Cart</h1>
        <p>
          {cartItems.length} item
          {cartItems.length !== 1 ? "s" : ""}
          {" "}in your cart
        </p>
      </div>

      <div className="cart-content">

        <div className="cart-items">

          {cartItems.length === 0 ? (

            <div className="cart-empty">

              <span className="empty-icon">🛒</span>

              <h2>
                Oops! Your cart is empty
              </h2>

              <p>Add some beautiful handmade products.</p>

            </div>

          ) : (

            cartItems.map((item) => (

              <div className="cart-item" key={item.id}>

                <img src={item.image} alt={item.name} />

                <div className="item-details">

                  <h3>{item.name}</h3>

                  <p className="item-price">
                    ₹{item.price}
                  </p>

                  <div className="quantity">

                    <button
                      className="qty-btn"
                      onClick={() => decrease(item.id)}
                    >
                      −
                    </button>

                    <span className="qty-count">
                      {item.quantity}
                    </span>

                    <button
                      className="qty-btn"
                      onClick={() => increase(item.id)}
                    >
                      +
                    </button>

                  </div>

                </div>

                <button
                  className="remove-btn"
                  onClick={() => remove(item.id)}
                >
                  Remove
                </button>

              </div>

            ))

          )}

        </div>
        {/* RIGHT: Order Summary */}
        <div className="cart-summary">

          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="summary-row">
            <span>Delivery</span>
            <span>
              {delivery === 0 ? "Free" : `₹${delivery}`}
            </span>
          </div>

          <div className="summary-row total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

          <button
            className="checkout-btn"
            disabled={cartItems.length === 0}
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout →
          </button>

        </div>

      </div>

    </div>
  );
}