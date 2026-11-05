import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../Navbar/Navbar";
import "./AdminOrders.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');

export default function AdminOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const hasFetchedOrders = useRef(false);
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("artstore_user")) || null;
        } catch {
            return null;
        }
    })();

    const fetchOrders = async () => {
        try {
            setError('');
            const token = localStorage.getItem("artstore_token");
            if (!token) {
                toast.error("Please sign in to view your orders.");
                navigate("/signin");
                return;
            }

            const response = await fetch(
                `${API_BASE_URL}/api/orders`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (response.status === 401) {
                    localStorage.removeItem("artstore_token");
                    localStorage.removeItem("artstore_user");
                    toast.error("Session expired. Please sign in again.");
                    navigate("/signin");
                    return;
                }
                throw new Error(data.message || 'Unable to load orders.');
            }

            setOrders(data.orders || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setError(error.message || 'Unable to load orders.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("artstore_token");
        if (!token) {
            navigate("/signin");
            return;
        }
        if (hasFetchedOrders.current) return;
        hasFetchedOrders.current = true;
        fetchOrders();
    }, [navigate]);

    return (
        <div className="admin-orders-page">
            <Navbar />
            <div className="orders-container">
                <h1>
                    {user?.role === "admin"
                        ? "📦 All Customer Orders"
                        : "📦 My Orders"}
                </h1>
                <p>
                    {user?.role === "admin"
                        ? "Manage and monitor all customer orders here."
                        : "Track and review your placed orders here."}
                </p>

                {loading ? (
                    <h2>Loading orders...</h2>
                ) : error ? (
                    <h2>{error}</h2>
                ) : orders.length === 0 ? (
                    <h2>No Orders Found 😔</h2>
                ) : (
                    <table className="orders-table">
                        <thead>
                            <tr>
                                {user?.role === "admin" && <th>Customer</th>}
                                <th>Order ID</th>
                                <th>Items</th>
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
                                    <td>
                                        <small style={{ fontFamily: 'monospace' }}>#{order._id?.slice(-8) || order._id}</small>
                                    </td>
                                    <td>
                                        {order.products?.map((p) => `${p.name} × ${p.quantity}`).join(', ') || 'N/A'}
                                    </td>
                                    <td>{order.payment}</td>
                                    <td><strong>₹{order.total}</strong></td>
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