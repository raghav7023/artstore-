import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { createPaymentOrder, verifyPayment } from '../controllers/payment.controller.js';

const router = express.Router();

// Create Razorpay order (protected)
router.post('/create-order', protect, createPaymentOrder);

// Verify payment signature (protected)
router.post('/verify', protect, verifyPayment);

export default router;
