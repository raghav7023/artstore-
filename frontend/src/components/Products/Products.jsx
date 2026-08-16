import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css';
import toast from "react-hot-toast";
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
  // { id: 15, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf08.jpeg' },
  { id: 16, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf09.jpeg' },
  { id: 17, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf10.jpeg' },
  { id: 18, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf11.jpeg' },
  { id: 19, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf12.jpeg' },
  { id: 20, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf13.jpeg' },
  { id: 21, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf14.jpeg' },
  { id: 22, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf15.jpeg' },
  { id: 23, name: 'Quiling frames', category: 'Quiling frames', price: 249, image: '/images/quilingframe/qf16.jpeg' },
  { id: 24, name: 'Sunflower Bouquet', category: 'Bouquets', price: 299, image: '/sunflower.jpeg' },
  { id: 25, name: ' Keychain', category: 'Keychains', price: 199, image: '/images/keychains/k01.jpeg' },
];

const filters = ['All', 'Bouquets', 'Keychains', 'Quiling frames', 'Hamper'];

export default function Products() {

  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('All');

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

  const filteredProducts =
    activeFilter === 'All'
      ? allProducts
      : allProducts.filter(p => p.category === activeFilter);

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
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

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