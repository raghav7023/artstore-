// ==========================================
// Navbar.jsx — Top Navigation Bar
// ==========================================

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {

  // Navigation
  const navigate = useNavigate();

  // Logged in user
  const user = JSON.parse(localStorage.getItem("artstore_user"));

  // Logout Function
  const handleLogout = () => {

    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    // Local Storage Clear
    localStorage.removeItem("artstore_token");
    localStorage.removeItem("artstore_user");

    // Redirect to Home
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ====== LOGO ====== */}
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">
            <img src="/artstore_logo.jpeg" alt="artstorelogo" />
          </span>

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

          {/* Products */}
          <Link to="/products" className="nav-btn">
            <span className="icon">🛍️</span>
            <span className="btn-text">Shop</span>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="nav-btn">
            <span className="icon">🛒</span>
            <span className="btn-text">Cart</span>
          </Link>
          {user && (
            <Link to="/admin/orders" className="nav-btn">
              <span className="icon">📦</span>
              <span className="btn-text">Orders</span>
            </Link>
          )}

          {/* User Logged In */}
          {user ? (
            <>
              {/* User Name */}
              <div className="nav-btn">
                <span className="icon">👋</span>
                <span className="btn-text">
                  Hi, {user.name}
                </span>
              </div>

              {/* Logout Button */}
              <button
                className="nav-btn nav-btn-primary"
                onClick={handleLogout}
              >
                <span className="icon">🚪</span>
                <span className="btn-text">Logout</span>
              </button>
            </>
          ) : (
            <>
              {/* Sign In */}
              <Link to="/signin" className="nav-btn nav-btn-primary">
                <span className="icon">✨</span>
                <span className="btn-text">Sign In</span>
              </Link>
            </>
          )}

        </div>

      </div>
    </nav>
  );
}