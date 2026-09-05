import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../Navbar/Navbar.jsx';
import { allProducts } from '../Products/Products.jsx';
import './ProductDetail.css';

const formatDisplayName = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ProductDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Use the same product list as the Products page, so no second request is needed.
  const product = allProducts.find((item) => item.id === Number(id));
  const isLoading = false;
  const error = product ? '' : 'Product not found';
  const returnFilter = location.state || {
    category: product?.category || 'All',
    subcategory: product?.subcategory || 'All',
  };

  const addToCart = () => {
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

  return (
    <div className="product-detail-page">
      <Navbar />
      <main className="product-detail-content">
        <button className="detail-back-link" onClick={() => navigate('/products', { state: returnFilter })}>
          ← Back to Products
        </button>

        {isLoading && <p className="product-detail-status">Loading product...</p>}
        {!isLoading && error && (
          <p className="product-detail-status product-detail-error">
            {error === 'Product not found' ? error : 'Failed to fetch product'}
          </p>
        )}

        {!isLoading && !error && product && (
          <section className="product-detail-layout">
            <div className="product-detail-image-wrap">
              <img src={product.image} alt={product.name} className="product-detail-image" loading="eager" decoding="async" />
            </div>
            <div className="product-detail-info">
              <p className="product-detail-category">{formatDisplayName(product.category)}</p>
              <h1>{product.name}</h1>
              <p className="product-detail-price">₹{product.price}</p>
              {product.subcategory && (
                <p className="product-detail-meta"><strong>Type:</strong> {formatDisplayName(product.subcategory)}</p>
              )}
              <div className="product-detail-actions">
                <button className="product-detail-cart-btn" onClick={addToCart}>Add to Cart</button>
                <button className="product-detail-products-btn" onClick={() => navigate('/products', { state: returnFilter })}>Back to Products</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
