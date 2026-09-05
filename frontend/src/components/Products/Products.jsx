import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../Navbar/Navbar.jsx';
import './Products.css';
import '../Home/Home.css';

// Product listing data used by the existing products page.
// eslint-disable-next-line react-refresh/only-export-components
export const allProducts = [


  { id: 9, name: 'Name frame', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf02.jpeg' },
  { id: 10, name: 'Couple frame', category: 'Quiling frames', price: 7999, image: '/images/quilingframe/qf03.jpeg' },
  { id: 11, name: 'Name frame', category: 'Quiling frames', price: 1899, image: '/images/quilingframe/qf04.jpeg' },
  { id: 12, name: 'Name frame', category: 'Quiling frames', price: 1999, image: '/images/quilingframe/qf05.jpeg' },
  { id: 13, name: 'Quiling Bird', category: 'Quiling frames', price: 3999, image: '/images/quilingframe/qf06.jpeg' },
  { id: 14, name: 'Name frame', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf07.jpeg' },
  { id: 16, name: 'Couple Name Frame frame', category: 'Quiling frames', price: 1699, image: '/images/quilingframe/qf09.jpeg' },
  { id: 17, name: 'Personality Name frame', category: 'Quiling frames', price: 6999, image: '/images/quilingframe/qf10.jpeg' },
  { id: 18, name: 'Couple Frame', category: 'Quiling frames', price: 1199, image: '/images/quilingframe/qf11.jpeg' },
  { id: 19, name: 'Kid Frame', category: 'Quiling frames', price: 2899, image: '/images/quilingframe/qf12.jpeg' },
  { id: 20, name: 'Single Letter frame', category: 'Quiling frames', price: 799, image: '/images/quilingframe/qf13.jpeg' },
  { id: 21, name: 'Name frame', category: 'Quiling frames', price: 2499, image: '/images/quilingframe/qf14.jpeg' },
  { id: 22, name: 'Name frame', category: 'Quiling frames', price: 2699, image: '/images/quilingframe/qf15.jpeg' },
  { id: 23, name: 'Aircraft frame', category: 'Quiling frames', price: 1899, image: '/images/quilingframe/qf16.jpeg' },
  { id: 24, name: 'Name frame', category: 'Quiling frames', price: 1499, image: '/images/quilingframe/qf17.jpeg' },
  { id: 25, name: 'Name frame', category: 'Quiling frames', price: 3499, image: '/images/quilingframe/qf18.jpeg' },
  { id: 26, name: 'Name frame', category: 'Quiling frames', price: 1599, image: '/images/quilingframe/qf19.jpeg' },
  { id: 27, name: 'Couple frame', category: 'Quiling frames', price: 3499, image: '/images/quilingframe/qf20.jpeg' },
  { id: 28, name: 'Single Letter frame', category: 'Quiling frames', price: 1999, image: '/images/quilingframe/qf21.jpeg' },
  { id: 29, name: 'Heart frame', category: 'Quiling frames', price: 999, image: '/images/quilingframe/qf22.jpeg' },
  { id: 200, name: 'Deadpool frame', category: 'Quiling frames', price: 899, image: '/images/quilingframe/qf23.jpeg' },
  // { id: 201, name: 'Quiling frame', category: 'Quiling frames', price: 599, image: '/images/quilingframe/qf24.jpeg' },
  // { id: 202, name: 'Quiling frame', category: 'Quiling frames', price: 499, image: '/images/quilingframe/qf25.jpeg' },
  { id: 203, name: 'Crochet frame', category: 'Quiling frames', price: 3999, image: '/images/quilingframe/qf26.jpeg' },




  { id: 49, name: 'Rose Flower Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 449, image: '/images/flowers/flower-20.jpeg' },
  { id: 50, name: 'Sunflower Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 349, image: '/images/flowers/flower-32.jpeg' },
  { id: 51, name: 'Rose Flower Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 449, image: '/images/flowers/flower-37.jpeg' },
  { id: 52, name: 'Rose', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-38.jpeg' },
  { id: 53, name: 'Rose', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-39.jpeg' },
  { id: 56, name: 'Rose', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-40.jpeg' },
  { id: 57, name: 'Rose', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-41.jpeg' },
  { id: 58, name: 'Sunflower(Double Layer)', category: 'crochet', subcategory: 'flower & flower pots', price: 499, image: '/images/flowers/flower-42.jpeg' },
  { id: 59, name: 'Open Tulip', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-43.jpeg' },
  { id: 60, name: 'Open Tulip', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-44.jpeg' },
  { id: 61, name: 'Small Sunflower', category: 'crochet', subcategory: 'flower & flower pots', price: 199, image: '/images/flowers/flower-45.jpeg' },
  { id: 62, name: 'Sunflower(Single Layer)', category: 'crochet', subcategory: 'flower & flower pots', price: 349, image: '/images/flowers/flower-46.jpeg' },
  { id: 63, name: 'White Rose Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 499, image: '/images/flowers/flower-47.jpeg' },
  { id: 64, name: 'Red Rose Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 499, image: '/images/flowers/flower-48.jpeg' },
  { id: 65, name: 'Pink Rose Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 499, image: '/images/flowers/flower-49.jpeg' },
  { id: 66, name: 'Pink Lily', category: 'crochet', subcategory: 'flower & flower pots', price: 349, image: '/images/flowers/flower-50.jpeg' },
  { id: 67, name: 'White Lily ', category: 'crochet', subcategory: 'flower & flower pots', price: 349, image: '/images/flowers/flower-51.jpeg' },
  // { id: 68, name: 'Open tulip Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 449, image: '/images/flowers/flower-52.jpeg' },
  { id: 69, name: 'Dual Sunflower Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 999, image: '/images/flowers/flower-53.jpeg' },
  { id: 70, name: 'Dual Rose Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 699, image: '/images/flowers/flower-54.jpeg' },
  { id: 71, name: 'Tulip Flower(One Piece)', category: 'crochet', subcategory: 'flower & flower pots', price: 179, image: '/images/flowers/flower-55.jpeg' },
  { id: 72, name: 'Tulip Flower(One Piece)', category: 'crochet', subcategory: 'flower & flower pots', price: 179, image: '/images/flowers/flower-56.jpeg' },
  { id: 73, name: 'Tulip Flower(One Piece)', category: 'crochet', subcategory: 'flower & flower pots', price: 179, image: '/images/flowers/flower-57.jpeg' },
  { id: 74, name: 'Tulip Flower(One Piece)', category: 'crochet', subcategory: 'flower & flower pots', price: 179, image: '/images/flowers/flower-58.jpeg' },
  { id: 75, name: 'Tulip Flower(One Piece)', category: 'crochet', subcategory: 'flower & flower pots', price: 179 , image: '/images/flowers/flower-59.jpeg' },
  { id: 76, name: 'Tulip Flower Pot', category: 'crochet', subcategory: 'flower & flower pots', price: 449, image: '/images/flowers/flower-60.jpeg' },





  { id: 101, name: 'Rainbow Charm', category: 'crochet', subcategory: 'keychains & charms', price: 349, image: '/images/keychains/keychain-2.jpeg' },
  { id: 102, name: 'Steering Charm', category: 'crochet', subcategory: 'keychains & charms', price: 399, image: '/images/keychains/keychain-3.jpeg' },
  { id: 105, name: 'Captain America', category: 'crochet', subcategory: 'keychains & charms', price: 499, image: '/images/keychains/keychain-6.jpeg' },
  { id: 106, name: 'Batman', category: 'crochet', subcategory: 'keychains & charms', price: 499, image: '/images/keychains/keychain-8.jpeg' },
  { id: 107, name: 'Turtle', category: 'crochet', subcategory: 'keychains & charms', price: 249, image: '/images/keychains/k9.jpeg' },
  { id: 108, name: 'Nick & Judy', category: 'crochet', subcategory: 'keychains & charms', price: 999, image: '/images/keychains/k10.jpeg' },
  { id: 109, name: 'Sunflower', category: 'crochet', subcategory: 'keychains & charms', price: 149, image: '/images/keychains/k11.jpeg' },
  { id: 113, name: 'Nazar', category: 'crochet', subcategory: 'keychains & charms', price: 199, image: '/images/keychains/k15.jpeg' },
  { id: 114, name: 'Bee', category: 'crochet', subcategory: 'keychains & charms', price: 249, image: '/images/keychains/k20.jpeg' },
  { id: 115, name: 'Jelly Fish', category: 'crochet', subcategory: 'keychains & charms', price: 299, image: '/images/keychains/k21.jpeg' },
  { id: 116, name: 'BasketBall', category: 'crochet', subcategory: 'keychains & charms', price: 219, image: '/images/keychains/k22.jpeg' },
  { id: 117, name: 'Duck', category: 'crochet', subcategory: 'keychains & charms', price: 349, image: '/images/keychains/k23.jpeg' },
  { id: 118, name: 'Spider Man', category: 'crochet', subcategory: 'keychains & charms', price: 449, image: '/images/keychains/k24.jpeg' },
  { id: 119, name: 'Snoopy', category: 'crochet', subcategory: 'keychains & charms', price: 449, image: '/images/keychains/k25.jpeg' },
  { id: 120, name: 'Rabit', category: 'crochet', subcategory: 'keychains & charms', price: 399, image: '/images/keychains/k26.jpeg' },
  { id: 121, name: 'Hary Potter', category: 'crochet', subcategory: 'keychains & charms', price: 599, image: '/images/keychains/k27.jpeg' },
  { id: 122, name: 'Bunny', category: 'crochet', subcategory: 'keychains & charms', price: 399, image: '/images/keychains/k28.jpeg' },





  { id: 130, name: 'White Parandi', category: 'crochet', subcategory: 'hair accessories', price: 499, image: '/images/hair/hair-1.jpeg' },
  { id: 131, name: 'Pink Parandi', category: 'crochet', subcategory: 'hair accessories', price: 499, image: '/images/hair/hair-2.jpeg' },
  { id: 134, name: 'Off White Bandana ', category: 'crochet', subcategory: 'hair accessories', price: 649, image: '/images/hair/hair-5.jpeg' },
  { id: 135, name: 'Clutcher', category: 'crochet', subcategory: 'hair accessories', price: 119, image: '/images/hair/hair-6.jpeg' },
  { id: 136, name: 'Cherry Hair Pin', category: 'crochet', subcategory: 'hair accessories', price: 119, image: '/images/hair/hair-7.jpeg' },
  { id: 137, name: 'Tulip Hair Pin', category: 'crochet', subcategory: 'hair accessories', price: 119, image: '/images/hair/hair-8.jpeg' },
  { id: 138, name: 'Daisy Hair Pin', category: 'crochet', subcategory: 'hair accessories', price: 249, image: '/images/hair/hair-9.jpeg' },
  { id: 139, name: 'Bow ', category: 'crochet', subcategory: 'hair accessories', price: 119, image: '/images/hair/hair-10.jpeg' },
  { id: 140, name: 'Butterfly Clip', category: 'crochet', subcategory: 'hair accessories', price: 149, image: '/images/hair/hair-11.jpeg' },
  { id: 141, name: 'Avocado Clip', category: 'crochet', subcategory: 'hair accessories', price: 149, image: '/images/hair/hair-12.jpeg' },
  { id: 142, name: 'Strawberry Clip', category: 'crochet', subcategory: 'hair accessories', price: 149, image: '/images/hair/hair-13.jpeg' },
  { id: 143, name: 'Gajra', category: 'crochet', subcategory: 'hair accessories', price: 399, image: '/images/hair/hair-14.jpeg' },




  { id: 150, name: 'Sunflower Lily Bouquet', category: 'Bouquets', price: 2649, image: '/images/bouquets/b1.jpeg' },
  { id: 151, name: '100 Roses Bouquet', category: 'Bouquets', price: 16999, image: '/images/bouquets/b2.jpeg' },
  { id: 153, name: 'Lily Tulip Bouquet', category: 'Bouquets', price: 5099, image: '/images/bouquets/b3.jpeg' },
  { id: 154, name: 'Sunflower Dasy Bouquet', category: 'Bouquets', price: 1799, image: '/images/bouquets/b4.jpeg' },
  { id: 156, name: 'Rose Bouquet', category: 'Bouquets', price: 1499, image: '/images/bouquets/b6.jpeg' },
  { id: 158, name: 'Tulip Lily Bouquet', category: 'Bouquets', price: 1599, image: '/images/bouquets/b8.jpeg' },
  { id: 159, name: 'Bouquet Blanket(30 inch)', category: 'Bouquets', price: 3499, image: '/images/bouquets/b9.jpeg' },



  { id: 400, name: 'Donut Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1299, image: '/images/crochetbag/cb1.jpeg' },
  { id: 401, name: 'Pouch', category: 'crochet', subcategory: 'crochet Bag', price: 199, image: '/images/crochetbag/cb2.jpeg' },
  { id: 402, name: 'Ocean Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1199, image: '/images/crochetbag/cb6.jpeg' },
  { id: 403, name: 'Granny Square Pouch', category: 'crochet', subcategory: 'crochet Bag', price: 119, image: '/images/crochetbag/cb3.jpeg' },
  { id: 404, name: 'Sling Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1299, image: '/images/crochetbag/cb7.jpeg' },
  { id: 405, name: 'Off White Daisy Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1699, image: '/images/crochetbag/cb8.jpeg' },
  { id: 406, name: 'Pink granny tote bag', category: 'crochet', subcategory: 'crochet Bag', price: 799, image: '/images/crochetbag/cb9.jpeg' },
  { id: 407, name: 'Bow Sling Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1599, image: '/images/crochetbag/cb10.jpeg' },
  { id: 408, name: 'Pink Rose Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1599, image: '/images/crochetbag/cb11.jpeg' },
  { id: 409, name: 'Rose Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1599, image: '/images/crochetbag/cb12.jpeg' },
  { id: 410, name: 'Sunflower Bag', category: 'crochet', subcategory: 'crochet Bag', price: 1399, image: '/images/crochetbag/cb13.jpeg' },





  { id: 500, name: 'Pinteresty Scarf', category: 'crochet', subcategory: 'Winter needs', price: 1899, image: '/images/winter/w1.jpeg' },
  { id: 501, name: 'Mikasa Scarf', category: 'crochet', subcategory: 'Winter needs', price: 1599, image: '/images/winter/w2.jpeg' },

];
const filters = ['All', 'Bouquets', 'crochet', 'Quiling frames'];

// Format names only for display; filter values stay unchanged.
const formatDisplayName = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(location?.state?.category || 'All');
  const [activeSubcategory, setActiveSubcategory] = useState(location?.state?.subcategory || 'All');
  const searchText = (location?.state?.search || '').toLowerCase();

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
  }).filter((product) => {
    if (!searchText) return true;
    return [product.name, product.category, product.subcategory, product.image]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchText));
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
            {formatDisplayName(filter)}
          </button>
        ))}
      </div>

      {activeFilter === 'crochet' && (
        <div className="subcategory-bar">
          {['All', 'keychains & charms', 'flower & flower pots', 'hair accessories', 'crochet Bag','Winter needs'].map((subcategory) => (
            <button
              key={subcategory}
              className={activeSubcategory === subcategory ? 'subcategory-btn active' : 'subcategory-btn'}
              onClick={() => setActiveSubcategory(subcategory)}
            >
              {formatDisplayName(subcategory)}
            </button>
          ))}
        </div>
      )}

      <div className="products-content">
        <>
          <p className="products-count">{filteredProducts.length} products found</p>
          <div className="products-grid-full">
            {filteredProducts.map((product) => (
              // Include the image path so each product card keeps its own identity.
              <div className="product-card" key={`${product.id}-${product.image}`}>
                <button
                  className="product-card-img product-image-button"
                  onClick={() => navigate(`/product/${product.id}`, {
                    state: { category: activeFilter, subcategory: activeSubcategory, search: searchText },
                  })}
                  aria-label={`View ${product.name}`}
                >
                  <img src={product.image} alt={product.name} />
                </button>
                <div className="product-card-body">
                  <p className="product-card-tag">{formatDisplayName(product.category)}</p>
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
