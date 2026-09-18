import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createPaymentOrder, verifyPayment, checkEmailHealth, handleRazorpayWebhook, resendOrderEmail } from '../controllers/payment.controller.js';

const router = express.Router();

// Email SMTP diagnostic check
router.get('/email-health', checkEmailHealth);

// Resend order confirmation emails (protected)
router.post('/resend-email/:orderId', protect, resendOrderEmail);

// Razorpay Webhook endpoint (cryptographically verified)
router.post('/webhook', handleRazorpayWebhook);

// Create Razorpay order (protected)
router.post('/create-order', protect, createPaymentOrder);

// Verify payment signature (protected)
router.post('/verify', protect, verifyPayment);
router.post('/verify-payment', protect, verifyPayment);

export default router;
