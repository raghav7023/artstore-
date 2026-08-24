import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css';

// Product listing data used by the existing products page.
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
  { id: 13, name: 'Quiling frames', category: 'Quiling frames', price: 3999, image: '/images/quilingframe/qf06.jpeg' },
  { id: 14, name: 'Quiling frames', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf07.jpeg' },
  { id: 16, name: 'Quiling frames', category: 'Quiling frames', price: 1699, image: '/images/quilingframe/qf09.jpeg' },
  { id: 17, name: 'Quiling frames', category: 'Quiling frames', price: 6999, image: '/images/quilingframe/qf10.jpeg' },
  { id: 18, name: 'Quiling frames', category: 'Quiling frames', price: 899, image: '/images/quilingframe/qf11.jpeg' },
  { id: 19, name: 'Quiling frames', category: 'Quiling frames', price: 2899, image: '/images/quilingframe/qf12.jpeg' },
  { id: 20, name: 'Quiling frames', category: 'Quiling frames', price: 799, image: '/images/quilingframe/qf13.jpeg' },
  { id: 21, name: 'Quiling frames', category: 'Quiling frames', price: 2499, image: '/images/quilingframe/qf14.jpeg' },
  { id: 22, name: 'Quiling frames', category: 'Quiling frames', price: 2699, image: '/images/quilingframe/qf15.jpeg' },
  { id: 23, name: 'Quiling frames', category: 'Quiling frames', price: 1899, image: '/images/quilingframe/qf16.jpeg' },
  { id: 24, name: 'Quiling frames', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf17.jpeg' },
  { id: 25, name: 'Quiling frames', category: 'Quiling frames', price: 3499, image: '/images/quilingframe/qf18.jpeg' },
  { id: 26, name: 'Quiling frames', category: 'Quiling frames', price: 1599, image: '/images/quilingframe/qf19.jpeg' },
  { id: 27, name: 'Quiling frames', category: 'Quiling frames', price: 3499, image: '/images/quilingframe/qf20.jpeg' },
  { id: 28, name: 'Quiling frames', category: 'Quiling frames', price: 1999, image: '/images/quilingframe/qf21.jpeg' },
  { id: 29, name: 'Quiling frames', category: 'Quiling frames', price: 999, image: '/images/quilingframe/qf22.jpeg' },
  { id: 200, name: 'Quiling frames', category: 'Quiling frames', price: 899, image: '/images/quilingframe/qf23.jpeg' },
  { id: 201, name: 'Quiling frames', category: 'Quiling frames', price: 599, image: '/images/quilingframe/qf24.jpeg' },
  { id: 202, name: 'Quiling frames', category: 'Quiling frames', price: 499, image: '/images/quilingframe/qf25.jpeg' },



//   { id: 30, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-1.jpeg' },
  { id: 31, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-2.jpeg' },
//   { id: 32, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-3.jpeg' },
  { id: 33, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-4.jpeg' },
//   { id: 34, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-5.jpeg' },
//   { id: 35, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-6.jpeg' },
  { id: 36, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-7.jpeg' },
//   { id: 37, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-8.jpeg' },
//   { id: 38, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-9.jpeg' },
//   { id: 39, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-10.jpeg' },
  { id: 40, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-11.jpeg' },
//   { id: 41, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-12.jpeg' },
  { id: 42, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-13.jpeg' },
//   { id: 43, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-14.jpeg' },
//   { id: 44, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-15.jpeg' },
  { id: 45, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-16.jpeg' },
//   { id: 46, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-17.jpeg' },
  { id: 47, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-18.jpeg' },
  { id: 48, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-19.jpeg' },
  { id: 49, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-20.jpeg' },
//   { id: 50, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-21.jpeg' },
//   { id: 51, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-22.jpeg' },
//   { id: 53, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-23.jpeg' },
  { id: 54, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-24.jpeg' },
  { id: 55, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-25.jpeg' },
//   { id: 56, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-26.jpeg' },
//   { id: 57, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image: '/images/flowers/flower-27.jpeg' },
//   { id: 58, name: 'crochet flower & flower pots', category: 'crochet', subcategory: 'flower & flower pots', price: 799, image:  },
//   { id: 100, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-1.jpeg' },
  { id: 101, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-2.jpeg' },
  { id: 102, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-3.jpeg' },
  { id: 103, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-4.jpeg' },
  { id: 104, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-5.jpeg' },
  { id: 105, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-6.jpeg' },
  { id: 106, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/keychain-8.jpeg' },
  { id: 107, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k9.jpeg' },
  { id: 108, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k10.jpeg' },
  { id: 109, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k11.jpeg' },
  { id: 110, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k12.jpeg' },
  { id: 111, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k13.jpeg' },
  { id: 112, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k14.jpeg' },
  { id: 113, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k15.jpeg' },
  { id: 114, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k16.jpeg' },
  { id: 115, name: 'keychains & charms', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k17.jpeg' },





  { id: 130, name: 'crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-1.jpeg' },
  { id: 131, name: 'crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-2.jpeg' },
  { id: 132, name: 'crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-3.jpeg' },
  { id: 133, name: 'crochet hair accessories', category: 'crochet', subcategory: 'hair accessories', price: 199, image: '/images/hair/hair-4.jpeg' },




  { id: 150, name: 'Bouquet', category: 'Bouquets', price: 2349, image: '/images/bouquets/b1.jpeg' },
  { id: 151, name: 'Bouquet', category: 'Bouquets', price: 15999, image: '/images/bouquets/b2.jpeg' },
    { id: 152, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/flowers/flower-39.jpeg' },
    { id: 153, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/bouquets/b3.jpeg' },
    { id: 154, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/bouquets/b4.jpeg' },
    { id: 156, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/bouquets/b6.jpeg' },
    { id: 157, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/bouquets/b7.jpeg' },
    { id: 158, name: 'Bouquet', category: 'Bouquets', price: 1399, image: '/images/bouquets/b8.jpeg' },



    { id: 400, name: 'crochet hair accessories', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb1.jpeg' },
    { id: 400, name: 'crochet hair accessories', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb2.jpeg' },
    { id: 400, name: 'crochet hair accessories', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb3.jpeg' },
    { id: 400, name: 'crochet hair accessories', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb4.jpeg' },
    { id: 400, name: 'crochet hair accessories', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb5.jpeg' },

];
const filters = ['All', 'Bouquets', 'crochet', 'Quiling frames', 'Hamper'];

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(location?.state?.category || 'All');
  const [activeSubcategory, setActiveSubcategory] = useState('All');

  const addToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingProduct = cart.find((item) => item.id === product.id);

    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${product.name} added to cart`);
    navigate('/cart');
  };

  const filteredProducts = allProducts.filter((product) => {
    if (activeFilter === 'All') return true;
    if (product.category !== activeFilter) return false;
    return activeFilter !== 'crochet' || activeSubcategory === 'All' || product.subcategory === activeSubcategory;
  });

  return (
    <div className="products-page">
      <Navbar />
      <div className="products-header">
        <h1>Our Handmade Collection</h1>
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
          {['All', 'keychains & charms', 'flower & flower pots', 'hair accessories','crochet Bag'].map((subcategory) => (
            <button
              key={subcategory}
              className={activeSubcategory === subcategory ? 'subcategory-btn active' : 'subcategory-btn'}
              onClick={() => setActiveSubcategory(subcategory)}
            >
              {subcategory}
            </button>
          ))}
        </div>
      )}

      <div className="products-content">
        <>
            <p className="products-count">{filteredProducts.length} products found</p>
            <div className="products-grid-full">
              {filteredProducts.map((product) => (
                <div className="product-card" key={product.id}>
                  <button
                    className="product-card-img product-image-button"
                    onClick={() => navigate(`/product/${product.id}`)}
                    aria-label={`View ${product.name}`}
                  >
                    <img src={product.image} alt={product.name} />
                  </button>
                  <div className="product-card-body">
                    <p className="product-card-tag">{product.category}</p>
                    <h3>{product.name}</h3>
                    <div className="product-card-footer">
                      <span className="product-price">₹{product.price}</span>
                      <button className="product-buy-btn" onClick={() => addToCart(product)}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </>
      </div>
    </div>
  );
}
