import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        // Kis user ne order place kiya
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Customer Details
        name: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },

        address: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        pincode: {
            type: String,
            required: true,
        },

        // Payment Method
        payment: {
            type: String,
            default: "Cash on Delivery",
        },

        // Ordered Products
        products: [
            {
                id: Number,
                name: String,
                price: Number,
                quantity: Number,
                image: String,
            },
        ],

        // Total Amount
        total: {
            type: Number,
            required: true,
        },

        // Order Status
        status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Pending",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Order", orderSchema);