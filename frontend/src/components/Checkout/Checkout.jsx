import { useState, useEffect } from 'react';
import Navbar from '../Navbar/Navbar';
import './Checkout.css';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getDeliveryCharge } from '../../config/delivery.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function Checkout() {
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const delivery = getDeliveryCharge(cartItems);
    const total = subtotal + delivery;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
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
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.phone || !formData.address) {
            toast.error('Please fill required fields');
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

            const resp = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...formData, products: cartItems, payment: formData.payment }),
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
                key: key,
                amount: order.amount,
                currency: order.currency,
                name: 'Art Store',
                description: 'Payment for order',
                order_id: order.id,
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
                            localStorage.removeItem('cart');
                            navigate('/payment-success', { replace: true });
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
            rzp.open();
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            toast.error(error.message === 'Failed to fetch'
                ? 'Unable to place order. Please try again.'
                : error.message || 'Unable to place order. Please try again.');
        }
    };

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
                            <input type="tel" name="phone" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>Delivery Address</label>
                            <textarea name="address" rows="4" placeholder="Enter your complete address" value={formData.address} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input type="text" name="city" placeholder="Enter city" value={formData.city} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Pincode</label>
                            <input type="text" name="pincode" placeholder="Enter pincode" value={formData.pincode} onChange={handleChange} required />
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