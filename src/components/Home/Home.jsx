// ==========================================
// Home.jsx — Home Page
// ==========================================

 
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar.jsx';
import Hero from '../Hero/Hero.jsx';
import './Home.css';

// Featured products — IDs match allProducts in Products.jsx so
// clicking a card opens the correct ProductDetail page.
const featuredProducts = [
  {
    id: 150,
    name: 'Sunflower Lily Bouquet',
    category: 'Bouquets',
    price: 2649,
    image: '/images/bouquets/b1.jpeg',
  },
  {
    id: 51,
    name: 'Rose Flower Pot',
    category: 'crochet',
    price: 449,
    image: '/images/flowers/flower-37.jpeg',
  },
  {
    id: 404,
    name: 'Sling Bag',
    category: 'crochet',
    price: 1299,
    image: '/images/crochetbag/cb7.jpeg',
  },
  {
    id: 136,
    name: 'Cherry Hair Pin',
    category: 'crochet',
    price: 119,
    image: '/images/hair/hair-7.jpeg',
  },
];

// Categories list — 3 product categories only
// `name` is the display label, `value` is the exact category string used in products data
const categories = [
  { emoji: '💐', name: 'Crochet', value: 'crochet' },
  { emoji: '🌸', name: 'Quiling Frames', value: 'Quiling frames' },
  { emoji: '🔑', name: 'Bouquets', value: 'Bouquets' },
];

const formatDisplayName = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Home() {
  // useNavigate — React Router hook for navigating programmatically
  const navigate = useNavigate();

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
          {/* All 3 cards link to the products page filtered by category */}
          {categories.map((cat, index) => (
            <Link
              to="/products"
              state={{ category: cat.value || cat.name }}
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

      {/* ====== CUSTOM ORDER PROMO SECTION ====== */}
      {/* Separate promotional banner — NOT a category card */}
      <div className="custom-order-section">
        <div className="custom-order-content">
          <span className="custom-order-tag">✨ Made Just For You</span>
          <h2 className="custom-order-title">Create Something Made Just For You</h2>
          <p className="custom-order-desc">
            Have something special in mind? Customize your own handmade piece
            and make it truly yours.
          </p>
          {/* Links to the existing Customorders page */}
          <Link to="/custom-orders" className="custom-order-btn">
            Make Your Custom Order →
          </Link>
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
            // Entire card is a button — clicking anywhere opens the product detail page
            <button
              key={product.id}
              className="product-card featured-card-btn"
              onClick={() => navigate(`/product/${product.id}`)}
              aria-label={`View ${product.name}`}
            >

              {/* Product Image */}
              <div className="product-card-img">
                <img src={product.image} alt={product.name} />
              </div>

              {/* Product Info */}
              <div className="product-card-body">
                <p className="product-card-tag">{formatDisplayName(product.category)}</p>
                <h3>{product.name}</h3>

                <div className="product-card-footer">
                  {/* <span className="product-price">₹{product.price}</span> */}
                  {/* <button className="product-buy-btn">Add to Cart</button> */}
                </div>
              </div>

            </button>
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
