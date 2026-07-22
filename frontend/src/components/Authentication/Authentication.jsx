// ==========================================
// Authentication.jsx - Login & Signup Page
// ==========================================
// Purpose: Ye component Login aur Signup dono handle karta hai
// Ek hi page pe tab switch karke dono forms dikhate hain
// State → API call → JWT save → Redirect
// ==========================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Authentication.css';

export default function Authentication() {

  // ==========================================
  // STATE VARIABLES
  // ==========================================
  // useState = React mein data store karne ka tarika
  // [value, setValue] = Current value aur use change karne ka function

  // 'signup' ya 'signin' - kaunsa form dikhana hai
  const [activeTab, setActiveTab] = useState('signup');

  // Form fields ka data - sab ek object mein
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  // Loading state - API call ho rahi hai ya nahi
  const [isLoading, setIsLoading] = useState(false);

  // Error message dikhane ke liye
  const [error, setError] = useState('');

  // Success message
  const [success, setSuccess] = useState('');

  // Password show/hide toggle
  const [showPassword, setShowPassword] = useState(false);

  // Redirect karne ke liye
  const navigate = useNavigate();

  // ==========================================
  // FORM INPUT CHANGE HANDLER
  // ==========================================
  // Jab bhi user koi field mein type kare, ye function chalega
  // [e.target.name] = square bracket mein dynamic key name use karte hain
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  // ==========================================
  // TAB SWITCH HANDLER
  // ==========================================
  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  };

  // ==========================================
  // FRONTEND VALIDATION
  // ==========================================
  const validateForm = () => {
    if (activeTab === 'signup') {
      if (!formData.name.trim()) {
        setError('Please enter your full name.');
        return false;
      }
      if (formData.name.trim().length < 2) {
        setError('Name must be at least 2 characters.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please check again.');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return false;
      }
      if (!/\d/.test(formData.password)) {
        setError('Password must contain at least one number.');
        return false;
      }
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!formData.password) {
      setError('Please enter your password.');
      return false;
    }

    return true;
  };

  // ==========================================
  // FORM SUBMIT HANDLER
  // ==========================================
  const handleSubmit = async (e) => {
    // Page reload rokta hai
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // URL decide karo
      const url =
        activeTab === "signup"
          ? "https://artstore-backend.onrender.com/api/auth/signup"
          : "https://artstore-backend.onrender.com/api/auth/signin";
      // Body decide karo
      const body =
        activeTab === 'signup'
          ? {
              name: formData.name.trim(),
              email: formData.email.trim(),
              password: formData.password,
              phone: formData.phone.trim(),
            }
          : {
              email: formData.email.trim(),
              password: formData.password,
            };

      // API Call karo
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        // Token localStorage mein save karo
        localStorage.setItem('artstore_token', data.token);
        localStorage.setItem('artstore_user', JSON.stringify(data.user));

        setSuccess(data.message);

        // 1.5 second baad Home pe redirect karo
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Auth Error:', err);
      setError('Cannot connect to server. Please make sure the backend is running on port 2026.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // JSX - Jo screen pe dikhega
  // ==========================================
  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo Section */}
        <div className="auth-logo">
          <span className="auth-logo-icon">🧶</span>
          <h1>Art Store</h1>
          <p>Handmade with love ✨</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={activeTab === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchTab('signup')}
          >
            Sign Up
          </button>
          <button
            className={activeTab === 'signin' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchTab('signin')}
          >
            Sign In
          </button>
        </div>

        {/* Error Alert - sirf tab dikhe jab error ho */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Success Alert */}
        {success && <div className="alert alert-success">✅ {success}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Name Field - sirf signup mein dikhega */}
          {activeTab === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full Name
              </label>
              <input
                className="form-input"
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              className="form-input"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="password-wrapper">
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={activeTab === 'signup' ? 'Min 6 chars, include a number' : 'Enter your password'}
                autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
                disabled={isLoading}
              />
              {/* Show/Hide password button */}
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password - sirf signup mein */}
          {activeTab === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                className={
                  formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? 'form-input error'
                    : 'form-input'
                }
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
              {/* Real-time mismatch warning */}
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="form-error">⚠️ Passwords do not match</p>
              )}
            </div>
          )}

          {/* Phone Number - sirf signup mein, optional */}
          {activeTab === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Mobile Number{' '}
                <span style={{ color: '#c5b8b4', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                className="form-input"
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                autoComplete="tel"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button className="btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {activeTab === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              activeTab === 'signup' ? '🎨 Create Account' : '✨ Sign In'
            )}
          </button>

        </form>

        {/* Footer Links */}
        <div className="auth-footer" style={{ marginTop: '20px' }}>
          {activeTab === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button onClick={() => switchTab('signin')}>Sign In</button>
            </p>
          ) : (
            <p>
              New to Art Store?{' '}
              <button onClick={() => switchTab('signup')}>Create Account</button>
            </p>
          )}
        </div>

        {/* Back to Home link */}
        <div className="auth-footer" style={{ marginTop: '12px' }}>
          <Link to="/">← Back to Home</Link>
        </div>

      </div>
    </div>
  );
}
