// ==========================================
// Home.jsx — Home Page
// ==========================================

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar.jsx';
import Hero from '../Hero/Hero.jsx';
import './Home.css';

// Sample products data — baad mein backend se aayega
// Abhi ke liye hardcoded rakhte hain seekhne ke liye
const featuredProducts = [
  {
    id: 1,
    name: 'Sunflower Bouquet',
    category: 'Bouquets',
    price: 299,
    image: '/sunflower.jpeg',
  },
  {
    id: 2,
    name: 'key Chains',
    category: 'Decorations',
    price: 199,
    image: '/images/keychains/k01.jpeg',
  },
  {
    id: 3,
    name: 'gift Hamper',
    category: 'Hamper',
    price: 299,
    image: '/images/hamper/h06.jpeg',
  },
];

// Categories list
const categories = [
  { emoji: '💐', name: 'Crochet ' },
  { emoji: '🌸', name: 'Quiling frames' },
  { emoji: '🔑', name: 'Cards and Pun Cards' },
  { emoji: '🎁', name: 'Hamper' },
  { emoji: '✨', name: 'Custom Orders', },
];

export default function Home() {
  return (
    <div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Banner */}
      <Hero />

      {/* ====== CATEGORIES SECTION ====== */}
      <div className="categories-section">
        <div className="section-header">
          <span className="section-tag">Browse By Type</span>
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-subtitle">
            Find the perfect handmade piece for every occasion
          </p>
        </div>

        <div className="categories-grid">
          {/* .map() = Array ke har item ko card mein convert karo */}
          {categories.map((cat, index) => (
            <Link
              to={cat.name === "Custom Orders" ? "/custom-orders" : "/products"}
              className="category-card"
              key={index}
            >
              <span className="category-emoji">{cat.emoji}</span>
              <h3>{cat.name}</h3>
              <p>{cat.count}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ====== FEATURED PRODUCTS SECTION ====== */}
      <div className="products-section">
        <div className="section-header">
          <span className="section-tag">Bestsellers</span>
          <h2 className="section-title">Featured Collection</h2>
          <p className="section-subtitle">
            Our most loved handmade creations, picked just for you
          </p>
        </div>

        <div className="products-grid">
          {featuredProducts.map((product) => (
            <div className="product-card" key={product.id}>

              {/* Product Image */}
              <div className="product-card-img">
                <img src={product.image} alt={product.name} />
              </div>

              {/* Product Info */}
              <div className="product-card-body">
                <p className="product-card-tag">{product.category}</p>
                <h3>{product.name}</h3>

                <div className="product-card-footer">
                  {/* <span className="product-price">₹{product.price}</span> */}
                  {/* <button className="product-buy-btn">Add to Cart</button> */}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* View All button */}
        <div className="view-all-wrapper">
          <Link to="/products" className="view-all-btn">
            View All Products →
          </Link>
        </div>
      </div>

    </div>
  );
}
