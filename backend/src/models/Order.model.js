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
            default: "Razorpay",
        },

        // Ordered Products
        products: [
            {
                id: Number,
                name: String,
                price: Number,
                quantity: Number,
                image: String,
                category: String,
                subcategory: String,
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
        // Razorpay payment details (optional)
        razorpay: {
            order_id: String,
            payment_id: String,
            signature: String,
        },
        // Track email dispatch status
        emailsSent: {
            customer: { type: Boolean, default: false },
            owner: { type: Boolean, default: false },
            sentAt: Date,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);