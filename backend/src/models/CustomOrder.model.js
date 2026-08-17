import mongoose from 'mongoose';

const customOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    product: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '',
      trim: true,
    },
    budget: {
      type: Number,
      default: 0,
    },
    delivery: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Review', 'Approved', 'Completed', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('CustomOrder', customOrderSchema);
