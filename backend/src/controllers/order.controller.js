import Order from "../models/Order.model.js";

// ==========================================
// Create New Order
// POST /api/orders
// ==========================================

export const createOrder = async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            address,
            city,
            pincode,
            payment,
            products,
            total,
        } = req.body;

        const newOrder = await Order.create({

            // Logged in user ka id save hoga
            user: req.user.id,

            name,
            email,
            phone,
            address,
            city,
            pincode,
            payment,
            products,
            total,

        });

        res.status(201).json({
            success: true,
            message: "Order placed successfully!",
            order: newOrder,
        });

    } catch (error) {

        console.error("Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to place order.",
        });

    }

};
// ==========================================
// Get All Orders
// GET /api/orders
// ==========================================

export const getOrders = async (req, res) => {

    try {

        let orders;

        if (req.user.role === "admin") {

            // Admin -> sabke orders
            orders = await Order.find().sort({
                createdAt: -1,
            });

        } else {

            // User -> sirf apne orders
            orders = await Order.find({
                user: req.user.id,
            }).sort({
                createdAt: -1,
            });

        }

        res.status(200).json({
            success: true,
            orders,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch orders.",
        });

    }

};