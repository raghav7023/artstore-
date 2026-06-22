// ==========================================
// Products.jsx — Products Page
// ==========================================

import React, { useState } from 'react';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css'; // Product card styles reuse karo

// All products data — baad mein backend se fetch karenge
const allProducts = [
  { id: 1, name: 'Sunflower Bouquet',    category: 'Bouquets',      price: 299, image: '/sunflower.jpeg' },
  { id: 2, name: 'Crochet Flower Pot',   category: 'Decorations',   price: 499, image: '/flowers.jpeg'   },
  { id: 3, name: 'Rabbit Keychain',      category: 'Keychains',     price: 199, image: '/rabbit.jpeg'    },
  { id: 4, name: 'Rose Bouquet',         category: 'Bouquets',      price: 349, image: '/ower.jpeg' },
  { id: 5, name: 'Mini Cactus Plant',    category: 'Decorations',   price: 249, image: '/flowers.jpeg'   },
  { id: 6, name: 'Heart Keychain',       category: 'Keychains',     price: 149, image: '/rabbit.jpeg'    },
  { id: 7, name: 'Gift Hamper',          category: 'Gift Sets',     price: 699, image: '/gift.jpeg' },
  { id: 8, name: 'Lavender Flowers',     category: 'Flowers',       price: 179, image: '/flowers.jpeg'   },
];

// Filter categories
const filters = ['All', 'Flowers', 'Bouquets', 'Keychains', 'Decorations', 'Gift Sets'];

export default function Products() {

  // activeFilter = kaunsa filter selected hai
  const [activeFilter, setActiveFilter] = useState('All');

  // Filter karo — 'All' selected ho toh sab dikhao,
  // warna sirf us category ke products dikhao
  const filteredProducts =
    activeFilter === 'All'
      ? allProducts
      : allProducts.filter(p => p.category === activeFilter);

  return (
    <div className="products-page">

      {/* Navbar */}
      <Navbar />

      {/* Page Header */}
      <div className="products-header">
        <h1>Our Handmade Collection 🧶</h1>
        <p>Every piece is crafted with love and care</p>
      </div>

      {/* Filter Buttons */}
      <div className="filter-bar">
        {filters.map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="products-content">
        <p className="products-count">{filteredProducts.length} products found</p>

        <div className="products-grid-full">
          {filteredProducts.map((product) => (
            <div className="product-card" key={product.id}>

              {/* Image */}
              <div className="product-card-img">
                <img src={product.image} alt={product.name} />
              </div>

              {/* Info */}
              <div className="product-card-body">
                <p className="product-card-tag">{product.category}</p>
                <h3>{product.name}</h3>
                <div className="product-card-footer">
                  <span className="product-price">₹{product.price}</span>
                  <button className="product-buy-btn">Add to Cart</button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
