import mongoose from "mongoose";

const notificationDeliverySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "sending", "sent", "failed", "unknown"],
            default: "pending",
        },
        attemptCount: { type: Number, default: 0 },
        nextAttemptAt: Date,
        leaseToken: String,
        leaseUntil: Date,
        providerMessageId: String,
        lastError: String,
        lastAttemptAt: Date,
    },
    { _id: false }
);

const orderNotificationsSchema = new mongoose.Schema(
    {
        customerEmail: notificationDeliverySchema,
        ownerEmail: notificationDeliverySchema,
        whatsapp: notificationDeliverySchema,
    },
    { _id: false }
);

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

        state: {
            type: String,
            default: "",
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
            enum: [
                "Pending",
                "Processing",
                "Confirmed",
                "Shipped",
                "Out for Delivery",
                "Delivered",
                "Cancelled",
            ],
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
        notifications: {
            type: orderNotificationsSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
        autoIndex: false,
    }
);

orderSchema.index(
    { "razorpay.order_id": 1 },
    {
        unique: true,
        partialFilterExpression: { "razorpay.order_id": { $type: "string" } },
    }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);