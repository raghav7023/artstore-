// ==========================================
// Hero.jsx — Big Banner Section
// ==========================================

import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">

      {/* Main content */}
      <div className="hero-content">

        {/* Small badge label */}
        <div className="hero-badge">
          🧶 Handmade with Love
        </div>

        {/* Big heading */}
        <h1 className="hero-title">
          Beautiful <span>Crochet Art</span><br />
          ~ Handmade Gifts 
        </h1>

        {/* Description */}
        <p className="hero-desc">
          Discover our collection of handmade crochet , quilling , hampers & custom gifts. 🌸
        </p>

        {/* Buttons */}
        <div className="hero-buttons">
          <Link to="/products" className="hero-btn-primary">
            🛍️ Shop Now
          </Link>
          <Link to="/signin" className="hero-btn-secondary">
            ✨ Join Us
          </Link>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>50+</strong>
            <span>Products</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <strong>200+</strong>
            <span>Happy Customers</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <strong>100%</strong>
            <span>Handmade</span>
          </div>
        </div>

      </div>

      {/* Scroll hint */}
      <div className="hero-scroll">
        scroll ↓
      </div>

    </section>
  );
}
