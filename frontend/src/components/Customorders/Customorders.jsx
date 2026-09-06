import { useState } from "react";
import Navbar from "../Navbar/Navbar";
import toast from "react-hot-toast";
import "./Customorders.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026';

export default function Customorders() {

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        product: "",
        color: "",
        budget: "",
        delivery: "",
        message: "",
        image: null,
    });
    const [preview, setPreview] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });

    };

    const handleImage = (e) => {
        const file = e.target.files[0];

        setFormData({
            ...formData,
            image: file,
        });

        if (file) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        const token = localStorage.getItem('artstore_token');
        if (!token) {
            toast.error('Please sign in before submitting a custom order.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/custom-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    budget: formData.budget ? Number(formData.budget) : 0,
                    image: preview || '',
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to submit custom order.');
            }

            toast.success('Custom Order Submitted Successfully 🎉');

            setFormData({
                name: "",
                email: "",
                phone: "",
                product: "",
                color: "",
                // budget: "",
                delivery: "",
                message: "",
                image: null,
            });
            setPreview(null);
        } catch (error) {
            console.error('Custom order submit error:', error);
            toast.error(error.message || 'Unable to submit custom order.');
        }

    };

    return (

        <div className="custom-page">

            <Navbar />

            <div className="custom-container">

                {/* ── Intro / landing section ── */}
                <div className="custom-header">

                    <h1>✨ Create Something Made Just For You</h1>

                    <p>
                        Have something special in mind? Customize your own handmade piece
                        and make it truly yours.
                    </p>

                    {/* Info box */}
                    <div className="custom-intro-box">
                        <h2>Want to customize your order?</h2>
                        <p>
                            Tell us what you have in mind — choose your design, colors, size,
                            theme or any other details, and we'll help turn your idea into a
                            handmade creation.
                        </p>
                        {/* Scrolls down to the form below */}
                        <a href="#custom-form" className="custom-cta-btn">
                            Make Your Custom Order
                        </a>
                    </div>

                </div>

                <form id="custom-form" className="custom-form" onSubmit={handleSubmit}>

                    <div className="form-group">

                        <label>Full Name</label>

                        <input
                            type="text"
                            name="name"
                            placeholder="Enter your name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>Email</label>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>Phone Number</label>

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Enter your mobile number"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>Product Type</label>

                        <select
                            name="product"
                            value={formData.product}
                            onChange={handleChange}
                            required
                        >

                            <option value="">Select Product</option>

                            <option>Crochet Flowers</option>

                            <option>Quilling Frame</option>

                            <option>Hamper</option>

                            <option>Greeting Card</option>

                            <option>Keychain</option>

                            <option>Other</option>

                        </select>

                    </div>
                    <div className="form-group">

                        <label>Preferred Color</label>

                        <input
                            type="text"
                            name="color"
                            placeholder="e.g. Pink, White, Blue..."
                            value={formData.color}
                            onChange={handleChange}
                        />

                    </div>

                    {/* <div className="form-group">

                        <label>Budget (₹)</label>

                        <input
                            type="number"
                            name="budget"
                            placeholder="Enter your budget"
                            value={formData.budget}
                            onChange={handleChange}
                        />

                    </div> */}

                    <div className="form-group">

                        <label>Required Delivery Date</label>

                        <input
                            type="date"
                            name="delivery"
                            value={formData.delivery}
                            onChange={handleChange}
                        />
                        {preview && (
                            <img
                                src={preview}
                                alt="Preview"
                                className="preview-image"
                            />
                        )}

                    </div>

                    <div className="form-group">

                        <label>Reference Image</label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImage}
                        />

                    </div>

                    <div className="form-group">

                        <label>Describe Your Order</label>

                        <textarea
                            rows="5"
                            name="message"
                            placeholder="Tell us about your custom order..."
                            value={formData.message}
                            onChange={handleChange}
                            required
                        />

                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                    >
                        🚀 Submit Custom Order
                    </button>

                </form>

            </div>

        </div>

    );

}