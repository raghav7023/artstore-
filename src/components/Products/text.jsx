
import { useState } from 'react';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css'; // Product card styles reuse karo

// All products data — baad mein backend se fetch karenge
const allProducts = [
  { id: 1, name: 'Gift Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h01.jpeg' },
  { id: 2, name: 'Birthday Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h02.jpeg' },
  { id: 3, name: 'Gift Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h03.jpeg' },
  { id: 4, name: 'Gift Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h05.jpeg' },
  { id: 5, name: 'Gift Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h06.jpeg' },
  { id: 6, name: 'Gift Hamper', category: 'Hamper', price: 699, image: '/images/hamper/h07.jpeg' },
  { id: 9, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf02.jpeg' },
  { id: 10, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf03.jpeg' },
  { id: 11, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf04.jpeg' },
  { id: 12, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf05.jpeg' },
  { id: 13, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf06.jpeg' },
  { id: 14, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf07.jpeg' },
  { id: 15, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf08.jpeg' },
  { id: 16, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf09.jpeg' },
  { id: 17, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf10.jpeg' },
  { id: 18, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf11.jpeg' },
  { id: 19, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf12.jpeg' },
  { id: 20, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf13.jpeg' },
  { id: 21, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf14.jpeg' },
  { id: 22, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf15.jpeg' },
  { id: 23, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf16.jpeg' },
  { id: 24, name: 'Sunflower Bouquet', category: 'Bouquets', price: 299, image: '/sunflower.jpeg' },
  { id: 25, name: 'Rabbit Keychain', category: 'Keychains', price: 199, image: '/rabbit.jpeg' },


];

// Filter categories
const filters = ['All', 'Bouquets', 'Keychains', 'Quiling frames', 'Hamper'];

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
