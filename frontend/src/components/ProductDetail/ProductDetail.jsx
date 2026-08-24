import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../Navbar/Navbar.jsx';
import './ProductDetail.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load this product.');
        setProduct(data.product);
      } catch (requestError) {
        setError(requestError.message || 'Unable to load this product.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

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
        <button className="detail-back-link" onClick={() => navigate('/products')}>
          ← Back to Products
        </button>

        {isLoading && <p className="product-detail-status">Loading product...</p>}
        {!isLoading && error && <p className="product-detail-status product-detail-error">{error}</p>}

        {!isLoading && !error && product && (
          <section className="product-detail-layout">
            <div className="product-detail-image-wrap">
              <img src={product.image} alt={product.name} className="product-detail-image" />
            </div>
            <div className="product-detail-info">
              <p className="product-detail-category">{product.category}</p>
              <h1>{product.name}</h1>
              <p className="product-detail-price">₹{product.price}</p>
              <p className="product-detail-description">
                {product.description || `A carefully handmade ${product.name.toLowerCase()} created with love and attention to detail.`}
              </p>
              {product.subcategory && (
                <p className="product-detail-meta"><strong>Type:</strong> {product.subcategory}</p>
              )}
              <div className="product-detail-actions">
                <button className="product-detail-cart-btn" onClick={addToCart}>Add to Cart</button>
                <button className="product-detail-products-btn" onClick={() => navigate('/products')}>Back to Products</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
