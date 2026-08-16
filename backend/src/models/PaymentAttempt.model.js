import mongoose from "mongoose";

const paymentAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    razorpay_order_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },
    products: [
      {
        id: Number,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    customer: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      pincode: String,
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentAttempt", paymentAttemptSchema);
