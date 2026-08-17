import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css';
import toast from "react-hot-toast";
// All products data — baad mein backend se fetch karenge
const allProducts = [
  { id: 1, name: 'Gift Hamper', category: 'Hamper', price: 299, image: '/images/hamper/h01.jpeg' },
  { id: 2, name: 'Birthday Hamper', category: 'Hamper', price: 5899, image: '/images/hamper/h02.jpeg' },
  { id: 3, name: 'Gift Hamper', category: 'Hamper', price: 3299, image: '/images/hamper/h03.jpeg' },
  { id: 4, name: 'Gift Hamper', category: 'Hamper', price: 999, image: '/images/hamper/h05.jpeg' },
  { id: 5, name: 'Gift Hamper', category: 'Hamper', price: 799, image: '/images/hamper/h06.jpeg' },
  
  
  { id: 9, name: 'Quiling frames', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf02.jpeg' },
  { id: 10, name: 'Quiling frames', category: 'Quiling frames', price: 7999, image: '/images/quilingframe/qf03.jpeg' },
  { id: 11, name: 'Quiling frames', category: 'Quiling frames', price: 1899, image: '/images/quilingframe/qf04.jpeg' },
  { id: 12, name: 'Quiling frames', category: 'Quiling frames', price: 1999, image: '/images/quilingframe/qf05.jpeg' },
  { id: 13, name: 'Quiling frames', category: 'Quiling frames', price: 2999, image: '/images/quilingframe/qf06.jpeg' },
  { id: 14, name: 'Quiling frames', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf07.jpeg' },
  // { id: 15, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf08.jpeg' },
  { id: 16, name: 'Quiling frames', category: 'Quiling frames', price: 999, image: '/images/quilingframe/qf09.jpeg' },
  { id: 17, name: 'Quiling frames', category: 'Quiling frames', price: 6999, image: '/images/quilingframe/qf10.jpeg' },
  { id: 18, name: 'Quiling frames', category: 'Quiling frames', price: 899, image: '/images/quilingframe/qf11.jpeg' },
  { id: 19, name: 'Quiling frames', category: 'Quiling frames', price: 2899, image: '/images/quilingframe/qf12.jpeg' },
  { id: 20, name: 'Quiling frames', category: 'Quiling frames', price: 799, image: '/images/quilingframe/qf13.jpeg' },
  { id: 21, name: 'Quiling frames', category: 'Quiling frames', price: 2499, image: '/images/quilingframe/qf14.jpeg' },
  { id: 22, name: 'Quiling frames', category: 'Quiling frames', price: 2699, image: '/images/quilingframe/qf15.jpeg' },
  { id: 23, name: 'Quiling frames', category: 'Quiling frames', price: 1899, image: '/images/quilingframe/qf16.jpeg' },
  { id: 25, name: ' Keychain', category: 'Quiling frames', price: 499, image: '/images/keychains/k01.jpeg' },
  // { id: 26, name: 'Crochet Rose', category: 'crochet', subcategory: 'Flowers', price: 499, image: '/images/crochet/c01.jpeg' },


  { id: 30, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-1.jpeg' },
  { id: 31, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-2.jpeg' },
  { id: 32, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-3.jpeg' },
  { id: 33, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-4.jpeg' },
  { id: 34, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-5.jpeg' },
  { id: 35, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-6.jpeg' },
  { id: 36, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-7.jpeg' },
  { id: 37, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-8.jpeg' },
  { id: 38, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-9.jpeg' },
  { id: 39, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-10.jpeg' },
  { id: 40, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-11.jpeg' },
  { id: 41, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-12.jpeg' },
  { id: 42, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-13.jpeg' },
  { id: 43, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-14.jpeg' },
  { id: 44, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-15.jpeg' },
  { id: 45, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-16.jpeg' },
  { id: 46, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-17.jpeg' },
  { id: 47, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-18.jpeg' },
  { id: 48, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-19.jpeg' },
  { id: 49, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-20.jpeg' },
  { id: 50, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-21.jpeg' },
  { id: 51, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-22.jpeg' },
  { id: 53, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-23.jpeg' },
  { id: 54, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-24.jpeg' },
  { id: 55, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-25.jpeg' },
  { id: 56, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-26.jpeg' },
  { id: 57, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-27.jpeg' },
  { id: 58, name: 'Crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-39.jpeg' },


  { id: 100, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-1.jpeg' },
  { id: 101, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-2.jpeg' },
  { id: 102, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-3.jpeg' },
  { id: 103, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-4.jpeg' },
  { id: 104, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-5.jpeg' },
  { id: 105, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-6.jpeg' },
  { id: 106, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-7.jpeg' },


  { id: 130, name: 'Crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-1.jpeg' },
  { id: 131, name: 'Crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-2.jpeg' },
  { id: 132, name: 'Crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-3.jpeg' },
  { id: 133, name: 'Crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-4.jpeg' },


  { id: 150, name:  'Bouquet', category: 'Bouquets', price: 899, image: '/images/bouquets/b1.jpeg' },
  { id: 150, name:  'Bouquet', category: 'Bouquets', price: 899, image: '/images/bouquets/b2.jpeg' },


];

const filters = ['All', 'Bouquets', 'crochet', 'Quiling frames', 'Hamper'];

export default function Products() {

  const navigate = useNavigate();

  const location = useLocation();

  // If a category was passed from Home via navigation state, use it as the initial filter.
  // Otherwise default to 'All'. This preserves direct /products behaviour.
  const initialCategory = location?.state?.category || 'All';

  const [activeFilter, setActiveFilter] = useState(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState('All');

  // ==========================
  // Add To Cart Function
  // ==========================
  const addToCart = (product) => {

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existingProduct = cart.find(item => item.id === product.id);

    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({
        ...product,
        quantity: 1,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    toast.success(`${product.name} added to cart 🛒`);

    navigate("/cart");
  };

  const filteredProducts = allProducts.filter((product) => {

    // Main category filter
    if (activeFilter === 'All') {
      return true;
    }

    if (product.category !== activeFilter) {
      return false;
    }

    // Crochet subcategory filter
    if (activeFilter === 'crochet' && activeSubcategory !== 'All') {
      return product.subcategory === activeSubcategory;
    }

    return true;
  });

  return (
    <div className="products-page">

      <Navbar />

      <div className="products-header">
        <h1>Our Handmade Collection 🧶</h1>
        <p>Every piece is crafted with love and care</p>
      </div>

      <div className="filter-bar">
        {filters.map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? 'filter-btn active' : 'filter-btn'}
            onClick={() => {
              setActiveFilter(filter);
              setActiveSubcategory('All');
            }}
          >
            {filter}
          </button>
        ))}
      </div>
      {activeFilter === 'crochet' && (
        <div className="subcategory-bar">

          {['All', 'keychains & charms', 'flower & flower pots', 'hair accessories'].map((sub) => (
            <button
              key={sub}
              className={
                activeSubcategory === sub
                  ? 'subcategory-btn active'
                  : 'subcategory-btn'
              }
              onClick={() => setActiveSubcategory(sub)}
            >
              {sub}
            </button>
          ))}

        </div>
      )}

      <div className="products-content">
        <p className="products-count">
          {filteredProducts.length} products found
        </p>

        <div className="products-grid-full">

          {filteredProducts.map((product) => (

            <div className="product-card" key={product.id}>

              <div className="product-card-img">
                <img src={product.image} alt={product.name} />
              </div>

              <div className="product-card-body">

                <p className="product-card-tag">
                  {product.category}
                </p>

                <h3>{product.name}</h3>

                <div className="product-card-footer">

                  <span className="product-price">
                    ₹{product.price}
                  </span>
                  <button
                    className="product-buy-btn"
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}