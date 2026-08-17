import { useEffect, useState } from "react";
import Navbar from "../Navbar/Navbar";
import "./AdminOrders.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026';

export default function AdminOrders() {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem("artstore_user"));
    const fetchOrders = async () => {

        try {

            const response = await fetch(
                `${API_BASE_URL}/api/orders`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("artstore_token")}`,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                setOrders(data.orders);
            }

        } catch (error) {

            console.error("Error fetching orders:", error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        (async () => {
            await fetchOrders();
        })();
    }, []);

    return (

        <div className="admin-orders-page">

            <Navbar />

            <div className="orders-container">

                <h1>
                    {user?.role === "admin"
                        ? "📦 All Orders"
                        : "📦 My Orders"}
                </h1>

                <p>
                    {user?.role === "admin"
                        ? "Manage all customer orders here."
                        : "Here are all your orders."}
                </p>

                {loading ? (

                    <h2>Loading Orders...</h2>

                ) : orders.length === 0 ? (

                    <h2>No Orders Found 😔</h2>

                ) : (

                    <table className="orders-table">

                            <thead>
                                        <tr>

                                            {user?.role === "admin" && <th>Customer</th>}

                                            <th>Phone</th>
                                            <th>Payment</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Date</th>

                                        </tr>
                            </thead>

                        <tbody>

                            {orders.map((order) => (

                                <tr key={order._id}>

                                    {user?.role === "admin" && (
                                        <td>
                                            <strong>{order.name}</strong>
                                            <br />
                                            <small>{order.email}</small>
                                        </td>
                                    )}

                                    <td>{order.phone}</td>

                                    <td>{order.payment}</td>

                                    <td>₹{order.total}</td>

                                    <td>
                                        <span className="status">
                                            {order.status}
                                        </span>
                                    </td>

                                    <td>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                )}

            </div>

        </div>

    );

}