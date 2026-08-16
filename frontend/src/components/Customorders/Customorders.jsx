import { useState } from "react";
import Navbar from "../Navbar/Navbar";
import toast from "react-hot-toast";
import "./Customorders.css";

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

    const handleSubmit = (e) => {

        e.preventDefault();

        toast.success("Custom Order Submitted Successfully 🎉");

        setFormData({
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

    };

    return (

        <div className="custom-page">

            <Navbar />

            <div className="custom-container">

                <div className="custom-header">

                    <h1>✨ Custom Order Request</h1>

                    <p>
                        Tell us what you want and we'll create a beautiful handmade
                        product specially for you.
                    </p>

                </div>

                <form className="custom-form" onSubmit={handleSubmit}>

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

                    <div className="form-group">

                        <label>Budget (₹)</label>

                        <input
                            type="number"
                            name="budget"
                            placeholder="Enter your budget"
                            value={formData.budget}
                            onChange={handleChange}
                        />

                    </div>

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