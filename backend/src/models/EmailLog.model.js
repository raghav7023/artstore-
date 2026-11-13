import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true },
    recipientName: { type: String, default: '' },
    emailType: {
      type: String,
      enum: ['order_confirmation_customer', 'order_confirmation_owner', 'custom_order_customer', 'custom_order_owner', 'payment_confirmation', 'admin_retry', 'other'],
      required: true,
    },
    subject: { type: String, required: true },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    provider: { type: String, enum: ['resend', 'smtp', 'none'], default: 'none' },
    providerMessageId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'unknown', 'delivered', 'bounced', 'complained'],
      default: 'pending',
    },
    errorMessage: { type: String, default: '' },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastAttemptAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

emailLogSchema.index({ relatedOrder: 1 });
emailLogSchema.index({ relatedUser: 1 });
emailLogSchema.index({ status: 1 });
emailLogSchema.index({ emailType: 1 });
emailLogSchema.index({ createdAt: -1 });

export default mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
