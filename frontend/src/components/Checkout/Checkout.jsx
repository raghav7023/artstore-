import { useState, useEffect } from 'react';
import Navbar from '../Navbar/Navbar';
import './Checkout.css';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { getDeliveryCharge } from '../../config/delivery.js';
import razorpayQrImg from '../../assets/razorpay-qr.jpg';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

const getCartFromStorage = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem('cart'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export default function Checkout() {
    const cartItems = getCartFromStorage();

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const delivery = getDeliveryCharge(cartItems);
    const total = subtotal + delivery;

    const savedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('artstore_user')) || {};
        } catch {
            return {};
        }
    })();

    const [formData, setFormData] = useState({
        name: savedUser.name || '',
        email: savedUser.email || '',
        phone: savedUser.phone || '',
        address: '',
        city: '',
        pincode: '',
        payment: 'Razorpay',
    });

    const [isProcessing, setIsProcessing] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('artstore_token');
        if (!token) {
            toast.error('Please sign in before checkout.');
            navigate('/signin');
        }
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!cartItems.length) {
            toast.error('Your cart is empty. Please add items before checking out.');
            return;
        }

        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedPhone = formData.phone.trim();
        const trimmedAddress = formData.address.trim();
        const trimmedCity = formData.city.trim();
        const trimmedPincode = formData.pincode.trim();

        if (!trimmedName || trimmedName.length < 2) {
            toast.error('Please enter a valid full name (at least 2 characters)');
            return;
        }
        if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!trimmedPhone || !/^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(trimmedPhone)) {
            toast.error('Please enter a valid 10-digit Indian mobile number');
            return;
        }
        if (!trimmedAddress) {
            toast.error('Please enter your complete delivery address');
            return;
        }
        if (!trimmedCity) {
            toast.error('Please enter your city');
            return;
        }
        if (!trimmedPincode || !/^\d{6}$/.test(trimmedPincode)) {
            toast.error('Please enter a valid 6-digit pincode');
            return;
        }

        setIsProcessing(true);

        try {
            const token = localStorage.getItem('artstore_token');
            if (!token) {
                toast.error('Please sign in before placing an order.');
                setIsProcessing(false);
                navigate('/signin');
                return;
            }

            const sanitizedPayload = {
                name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                address: trimmedAddress,
                city: trimmedCity,
                pincode: trimmedPincode,
                products: cartItems,
                payment: 'Razorpay',
            };

            const resp = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(sanitizedPayload),
            });

            const data = await resp.json();
            if (!resp.ok || !data.success) {
                if (resp.status === 401) {
                    localStorage.removeItem('artstore_token');
                    localStorage.removeItem('artstore_user');
                    toast.error(data.message || 'Session expired. Please sign in again.');
                    setIsProcessing(false);
                    navigate('/signin');
                    return;
                }
                throw new Error(data.message || 'Unable to place order. Please try again.');
            }

            const resScript = await loadRazorpayScript();
            if (!resScript) throw new Error('Razorpay SDK failed to load');

            const { key, order } = data;

            const options = {
                key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'Art Store',
                description: 'Payment for order',
                order_id: order.id,
                prefill: {
                    name: trimmedName,
                    email: trimmedEmail,
                    contact: trimmedPhone,
                },
                theme: {
                    color: '#2f5bd3',
                },
                handler: async function (response) {
                    try {
                        const verifyResp = await fetch(`${API_BASE_URL}/api/payments/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyResp.json();
                        if (verifyResp.status === 401) {
                            localStorage.removeItem('artstore_token');
                            localStorage.removeItem('artstore_user');
                            toast.error(verifyData.message || 'Session expired. Please sign in again.');
                            navigate('/signin');
                            return;
                        }
                        if (verifyData.success) {
                            // Cart is cleared strictly upon verified backend confirmation
                            localStorage.removeItem('cart');
                            navigate('/payment-success', { replace: true, state: { order: verifyData.order } });
                        } else {
                            navigate('/payment-failure', { replace: true });
                        }
                    } catch (err) {
                        console.error('Verification error', err);
                        navigate('/payment-failure', { replace: true });
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        toast('Payment cancelled');
                        setIsProcessing(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                console.error('Razorpay Payment Failed:', response.error);
                toast.error(response.error?.description || response.error?.reason || 'Payment failed. Please try again.');
                setIsProcessing(false);
            });
            rzp.open();
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            toast.error(error.message === 'Failed to fetch'
                ? 'Unable to place order. Please try again.'
                : error.message || 'Unable to place order. Please try again.');
        }
    };

    if (!cartItems.length) {
        return (
            <div className="checkout-page">
                <Navbar />
                <div className="checkout-container" style={{ display: 'flex', justifyContent: 'center', minHeight: '50vh', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', background: '#fff', padding: '50px 30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', maxWidth: '500px', width: '100%' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛒</div>
                        <h2 style={{ color: 'var(--text)', marginBottom: '10px' }}>Your Cart is Empty</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                            You need to add items to your cart before proceeding to checkout.
                        </p>
                        <Link to="/products" className="place-order-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                            🛍️ Explore Products
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <Navbar />
            <div className="checkout-container">
                <div className="checkout-left">
                    <h2>Delivery Details</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="tel" name="phone" placeholder="e.g. 9876543210" value={formData.phone} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>Delivery Address</label>
                            <textarea name="address" rows="3" placeholder="Enter your complete street address" value={formData.address} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input type="text" name="city" placeholder="Enter city" value={formData.city} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Pincode</label>
                            <input type="text" name="pincode" placeholder="6-digit pincode" maxLength={6} value={formData.pincode} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>Payment Method</label>
                            <select name="payment" value="Razorpay" disabled>
                                <option value="Razorpay">Online Payment (UPI, Cards, NetBanking via Razorpay)</option>
                            </select>
                        </div>

                        <button type="submit" className="place-order-btn" disabled={isProcessing}>
                            {isProcessing ? 'Processing…' : '💳 Pay with Razorpay'}
                        </button>

                        {/* Alternative UPI QR Scan Option */}
                        <div className="upi-payment-option full-width">
                            <div className="payment-divider">
                                <span>OR</span>
                            </div>

                            <div className="upi-qr-card">
                                <div className="upi-qr-header">
                                    <h3>Scan & Pay via UPI</h3>
                                    <p className="upi-qr-subtitle">
                                        Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI app
                                    </p>
                                </div>

                                <div className="upi-qr-image-wrapper">
                                    <img
                                        src={razorpayQrImg}
                                        alt="Scan & Pay via UPI - Razorpay QR Code"
                                        className="upi-qr-image"
                                    />
                                </div>

                                <div className="upi-qr-info">
                                    <div className="upi-amount-badge">
                                        Amount to Pay: <strong>₹{total}</strong>
                                    </div>
                                    <div className="upi-instructions">
                                        <p>
                                            <strong>📌 How it works:</strong>
                                        </p>
                                        <ol>
                                            <li>Open your preferred UPI app (GPay, PhonePe, Paytm, etc.).</li>
                                            <li>Scan the Razorpay QR code and transfer <strong>₹{total}</strong>.</li>
                                        </ol>
                                        <div className="upi-verification-note">
                                            <p>
                                                💡 <em>Recommended:</em> For <strong>instant automated confirmation</strong>, click <strong>Pay with Razorpay</strong> above (UPI apps are supported inside the popup with immediate order processing). Direct offline QR scans are manually verified before dispatch.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="checkout-right">
                    <h2>Order Summary</h2>
                    {cartItems.map((item) => (
                        <div className="summary-item" key={item.id}>
                            <img src={item.image} alt={item.name} />
                            <div>
                                <h4>{item.name}</h4>
                                <p>Qty : {item.quantity}</p>
                            </div>
                            <span>₹{item.price * item.quantity}</span>
                        </div>
                    ))}

                    <hr />
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>₹{subtotal}</span>
                    </div>
                    <div className="summary-row">
                        <span>Delivery</span>
                        <span>₹{delivery}</span>
                    </div>
                    <div className="summary-row total">
                        <span>Total</span>
                        <span>₹{total}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}