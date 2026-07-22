import React, { useState } from "react";
import Navbar from "../Navbar/Navbar";
import "./Checkout.css";
import Swal from "sweetalert2";
export default function Checkout() {

    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];

    const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const delivery = subtotal > 0 ? 50 : 0;
    const total = subtotal + delivery;

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        pincode: "",
        payment: "Cash on Delivery",
    });

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await fetch("http://localhost:2026/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("artstore_token")}`,
                },
                body: JSON.stringify({
                    ...formData,
                    products: cartItems,
                    total,
                }),
            });

            const data = await response.json();

            if (data.success) {

                Swal.fire({
                    icon: "success",
                    title: "🎉 Order Placed!",
                    html: `
          Thank you for shopping with <b>Art Store</b> ❤️
          <br><br>
          Your order has been placed successfully.
        `,
                    confirmButtonColor: "#ec4899",
                });

                localStorage.removeItem("cart");

                setFormData({
                    name: "",
                    email: "",
                    phone: "",
                    address: "",
                    city: "",
                    pincode: "",
                    payment: "Cash on Delivery",
                });

                setTimeout(() => {
                    window.location.href = "/";
                }, 2000);

            } else {

                Swal.fire({
                    icon: "error",
                    title: "Oops!",
                    text: "Order could not be placed.",
                });

            }

        } catch (error) {

            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Server Error",
                text: "Unable to connect to server.",
            });

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
                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your full name"
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
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Delivery Address</label>
                            <textarea
                                name="address"
                                rows="4"
                                placeholder="Enter your complete address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                placeholder="Enter city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Pincode</label>
                            <input
                                type="text"
                                name="pincode"
                                placeholder="Enter pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Payment Method</label>

                            <select
                                name="payment"
                                value={formData.payment}
                                onChange={handleChange}
                            >
                                <option>Cash on Delivery</option>
                                <option>UPI</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="place-order-btn"
                        >
                            🛍️ Place Order
                        </button>

                    </form>

                </div>

                {/* RIGHT SIDE */}
                <div className="checkout-right">

                    <h2>Order Summary</h2>

                    {cartItems.map(item => (

                        <div
                            className="summary-item"
                            key={item.id}
                        >

                            <img
                                src={item.image}
                                alt={item.name}
                            />

                            <div>

                                <h4>{item.name}</h4>

                                <p>
                                    Qty : {item.quantity}
                                </p>

                            </div>

                            <span>
                                ₹{item.price * item.quantity}
                            </span>

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