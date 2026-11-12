import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import './AdminPages.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('artstore_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`${API_BASE_URL}/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load products');
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>🛍️ Product Catalog</h2>
          <p className="admin-page-subtitle">{products.length} products listed in store catalog</p>
        </div>
      </div>

      <div className="admin-filters">
        <form className="admin-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by product name, category, or ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit">🔍 Search</button>
          {search && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
            >
              ✕ Clear
            </button>
          )}
        </form>

        <div className="filter-pills">
          <button
            className={`filter-pill ${categoryFilter === '' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('')}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-pill ${categoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading catalog products...</p>
        </div>
      ) : error ? (
        <div className="admin-page-error">
          <p>❌ {error}</p>
          <button onClick={() => fetchProducts()}>Retry</button>
        </div>
      ) : products.length === 0 ? (
        <div className="admin-page-empty">
          <p>No products match your search or filter.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid #e8e0d8',
                      }}
                      onError={(e) => {
                        e.target.src = '/artstore_logo.jpeg';
                      }}
                    />
                  </td>
                  <td>
                    <code>#{p.id}</code>
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    <span className="role-badge" style={{ background: '#f5f0eb', color: '#6b5c57' }}>
                      {p.category}
                    </span>
                  </td>
                  <td>{p.subcategory || '—'}</td>
                  <td>
                    <strong>₹{Number(p.price).toLocaleString('en-IN')}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
