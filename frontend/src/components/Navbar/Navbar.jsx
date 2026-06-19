// ==========================================
// Navbar.jsx — Top Navigation Bar
// ==========================================

import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {

  // useLocation = current URL kya hai ye batata hai
  // Example: user /products pe hai toh pathname = "/products"
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ====== LOGO ====== */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon"><img src='/artstore_logo.jpeg' alt="artstorelogo"/></span>
          <div className="navbar-logo-text">
            <span>Art Store</span>
            <span>Handmade with love</span>
          </div>
        </Link>

        {/* ====== SEARCH BAR ====== */}
        <div className="navbar-search">
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search crochet flowers, keychains..."
          />
        </div>

        {/* ====== RIGHT SIDE BUTTONS ====== */}
        <div className="navbar-actions">

          {/* Products button */}
          <Link to="/products" className="nav-btn">
            <span className="icon">🛍️</span>
            <span className="btn-text">Shop</span>
          </Link>

          {/* Cart button */}
          <Link to="/cart" className="nav-btn">
            <span className="icon">🛒</span>
            <span className="btn-text">Cart</span>
          </Link>

          {/* Sign In button (highlighted) */}
          <Link to="/signin" className="nav-btn nav-btn-primary">
            <span className="icon">✨</span>
            <span className="btn-text">Sign In</span>
          </Link>

        </div>

      </div>
    </nav>
  );
}