import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../Navbar/Navbar";
import "./AdminOrders.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:2026').replace(/\/+$/, '');
const formatCurrency = (amount) =>
    `₹${(Number(amount) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
const getOrderSubtotal = (order) =>
    (order?.products || []).reduce(
        (total, product) =>
            total + (Number(product.price) || 0) * (Number(product.quantity) || 0),
        0
    );

export default function AdminOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [orderDetails, setOrderDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');
    const hasFetchedOrders = useRef(false);
    const detailRequestId = useRef(0);
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("artstore_user")) || null;
        } catch {
            return null;
        }
    })();
    const userRole = user?.role;

    const fetchOrders = useCallback(async () => {
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
    }, [navigate]);

    const fetchOrderDetails = async (orderId) => {
        const requestId = ++detailRequestId.current;
        setSelectedOrderId(orderId);
        setOrderDetails(null);
        setDetailsError('');
        setDetailsLoading(true);

        try {
            const token = localStorage.getItem("artstore_token");
            if (!token) {
                toast.error("Please sign in to view your orders.");
                navigate("/signin");
                throw new Error("Please sign in to view order details.");
            }

            const response = await fetch(
                `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                localStorage.removeItem("artstore_token");
                localStorage.removeItem("artstore_user");
                toast.error("Session expired. Please sign in again.");
                navigate("/signin");
                throw new Error("Session expired. Please sign in again.");
            }
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || "Unable to load order details.");
            }

            if (requestId === detailRequestId.current) {
                setOrderDetails(data.order);
            }
        } catch (requestError) {
            if (requestId === detailRequestId.current) {
                setDetailsError(requestError.message || "Unable to load order details.");
            }
        } finally {
            if (requestId === detailRequestId.current) {
                setDetailsLoading(false);
            }
        }
    };

    const closeOrderDetails = useCallback(() => {
        detailRequestId.current += 1;
        setSelectedOrderId(null);
        setOrderDetails(null);
        setDetailsLoading(false);
        setDetailsError('');
    }, []);

    useEffect(() => {
        if (userRole === "admin") {
            navigate("/admin/orders", { replace: true });
            return;
        }

        const token = localStorage.getItem("artstore_token");
        if (!token) {
            navigate("/signin");
            return;
        }
        if (hasFetchedOrders.current) return;
        hasFetchedOrders.current = true;
        const loadOrders = async () => {
            await fetchOrders();
        };
        loadOrders();
    }, [fetchOrders, navigate, userRole]);

    useEffect(() => {
        if (!selectedOrderId) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") closeOrderDetails();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [closeOrderDetails, selectedOrderId]);

    const canViewOrderDetails = userRole !== "admin";

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
                                <tr
                                    key={order._id}
                                    className={canViewOrderDetails ? "order-row-clickable" : undefined}
                                    tabIndex={canViewOrderDetails ? 0 : undefined}
                                    aria-label={canViewOrderDetails ? `View details for order ${order._id}` : undefined}
                                    onClick={canViewOrderDetails ? () => fetchOrderDetails(order._id) : undefined}
                                    onKeyDown={canViewOrderDetails ? (event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            fetchOrderDetails(order._id);
                                        }
                                    } : undefined}
                                >
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

            {selectedOrderId && (
                <div
                    className="order-details-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeOrderDetails();
                    }}
                >
                    <section
                        className="order-details-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-details-title"
                    >
                        <div className="order-details-header">
                            <h2 id="order-details-title">Order Details</h2>
                            <button
                                type="button"
                                className="order-details-close"
                                onClick={closeOrderDetails}
                            >
                                Close
                            </button>
                        </div>

                        {detailsLoading ? (
                            <div className="order-details-loading" role="status" aria-live="polite">
                                <span className="order-details-spinner" aria-hidden="true" />
                                Loading order details...
                            </div>
                        ) : detailsError ? (
                            <div className="order-details-error" role="alert">
                                <p>{detailsError}</p>
                                <button
                                    type="button"
                                    onClick={() => fetchOrderDetails(selectedOrderId)}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : orderDetails ? (
                            <div className="order-details-content">
                                <div className="order-details-summary">
                                    <div className="order-details-id">
                                        <span>Order ID</span>
                                        <strong>{orderDetails._id}</strong>
                                    </div>
                                    <div className="order-details-status">
                                        <span>Order status</span>
                                        <strong className="status">{orderDetails.status || "Pending"}</strong>
                                    </div>
                                </div>

                                <h3>Items</h3>
                                <div className="order-detail-products">
                                    {(orderDetails.products || []).map((product, index) => (
                                        <div
                                            className="order-detail-product"
                                            key={`${product.id || product.name || "item"}-${index}`}
                                        >
                                            {product.image ? (
                                                <img src={product.image} alt="" loading="lazy" />
                                            ) : (
                                                <div className="order-detail-no-image">No image</div>
                                            )}
                                            <div className="order-detail-product-info">
                                                <strong>{product.name || "Product"}</strong>
                                                <span>
                                                    {Number(product.quantity) || 0} × {formatCurrency(product.price)}
                                                </span>
                                            </div>
                                            <strong>
                                                {formatCurrency(
                                                    (Number(product.price) || 0) *
                                                    (Number(product.quantity) || 0)
                                                )}
                                            </strong>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-details-grid">
                                    <section>
                                        <h3>Payment</h3>
                                        <dl>
                                            <div>
                                                <dt>Method</dt>
                                                <dd>{orderDetails.payment || "Not recorded"}</dd>
                                            </div>
                                            <div>
                                                <dt>Payment status</dt>
                                                <dd>
                                                    {orderDetails.razorpay?.payment_id
                                                        ? "Paid"
                                                        : "Not available"}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Order date</dt>
                                                <dd>{new Date(orderDetails.createdAt).toLocaleString()}</dd>
                                            </div>
                                        </dl>
                                    </section>

                                    <section>
                                        <h3>Delivery and contact</h3>
                                        <dl>
                                            <div>
                                                <dt>Name</dt>
                                                <dd>{orderDetails.name || "Not recorded"}</dd>
                                            </div>
                                            <div>
                                                <dt>Email</dt>
                                                <dd>{orderDetails.email || "Not recorded"}</dd>
                                            </div>
                                            <div>
                                                <dt>Phone</dt>
                                                <dd>{orderDetails.phone || "Not recorded"}</dd>
                                            </div>
                                            <div>
                                                <dt>Address</dt>
                                                <dd>
                                                    {[orderDetails.address, orderDetails.city, orderDetails.state, orderDetails.pincode]
                                                        .filter(Boolean)
                                                        .join(", ") || "Not recorded"}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>
                                </div>

                                <div className="order-details-totals">
                                    <div>
                                        <span>Subtotal</span>
                                        <strong>{formatCurrency(getOrderSubtotal(orderDetails))}</strong>
                                    </div>
                                    <div className="order-details-total">
                                        <span>Total paid</span>
                                        <strong>{formatCurrency(orderDetails.total)}</strong>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </div>
            )}
        </div>
    );
}