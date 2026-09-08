import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentAttempt from '../models/PaymentAttempt.model.js';
import Order from '../models/Order.model.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../Config.mjs';
import { getDeliveryCharge } from '../config/delivery.config.js';
// sendOrderEmails: sends store-owner + customer emails after a successful order
import { sendOrderEmails } from '../utils/emailService.js';

// Lazily initialize Razorpay only if credentials are provided
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  } catch (err) {
    console.error('Razorpay init error:', err.message);
    razorpay = null;
  }
} else {
  // Do not throw during startup; payment endpoints will return an error instead
  razorpay = null;
}

// Helper: calculate amount from products array (in paise)
const calculateAmountFromProducts = (products) => {
  let total = 0;
  for (const p of products) {
    const qty = Number(p.quantity) || 0;
    const price = Number(p.price) || 0;
    if (qty <= 0 || price < 0) throw new Error('Invalid product data');
    total += qty * price;
  }

  const delivery = getDeliveryCharge(products);
  return Math.round((total + delivery) * 100);
};

// POST /api/payments/create-order or /api/create-order
export const createPaymentOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const {
      name,
      email,
      phone,
      address,
      city,
      pincode,
      payment, // payment method selected
      products,
      amount,
      currency = 'INR',
      receipt,
    } = req.body;

    // Reject Cash on Delivery — only Razorpay online payment is accepted
    if (payment === 'Cash on Delivery' || payment === 'cod' || payment?.toLowerCase() === 'cash on delivery') {
      return res.status(400).json({
        success: false,
        message: 'Cash on Delivery is no longer accepted. Please use online payment (Razorpay).',
      });
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    // Determine amount in paise (minimum 100 paise = Rs. 1)
    let amountInPaise = 0;
    if (products && Array.isArray(products) && products.length > 0) {
      // Recalculate amount on server for cart items — do NOT trust frontend total
      amountInPaise = calculateAmountFromProducts(products);
    } else if (amount) {
      amountInPaise = Math.round(Number(amount));
    } else {
      return res.status(400).json({ success: false, message: 'Products or amount is required' });
    }

    // Validate minimum amount (Razorpay requires minimum 100 paise)
    if (!amountInPaise || isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least 100 paise (₹1)',
      });
    }

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const rOrder = await razorpay.orders.create(options);

    // Save a payment attempt if user & products/customer info available
    let attempt = null;
    if (userId) {
      attempt = await PaymentAttempt.create({
        user: userId,
        razorpay_order_id: rOrder.id,
        amount: amountInPaise,
        currency: currency || 'INR',
        products: products || [],
        customer: { name: name || '', email: email || '', phone: phone || '', address: address || '', city: city || '', pincode: pincode || '' },
        status: 'created',
      });
    }

    // Return standard Razorpay order information to client
    res.status(200).json({
      success: true,
      key: RAZORPAY_KEY_ID,
      order: rOrder,
      order_id: rOrder.id,
      amount: rOrder.amount,
      currency: rOrder.currency,
      attemptId: attempt ? attempt._id : undefined,
    });
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to create payment order' });
  }
};

// POST /api/payments/verify or /api/verify-payment
export const verifyPayment = async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const rOrderId = req.body.razorpay_order_id || req.body.order_id;
    const rPaymentId = req.body.razorpay_payment_id || req.body.payment_id;
    const rSignature = req.body.razorpay_signature || req.body.signature;

    if (!rOrderId || !rPaymentId || !rSignature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Compute expected signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(rOrderId + '|' + rPaymentId)
      .digest('hex');

    if (generated_signature !== rSignature) {
      console.warn('Invalid Razorpay signature', { rOrderId, rPaymentId });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find corresponding payment attempt
    const attempt = await PaymentAttempt.findOne({ razorpay_order_id: rOrderId });
    if (!attempt) {
      // Valid signature even if standalone verification without previous attempt in DB
      return res.status(200).json({ success: true, message: 'Payment signature verified successfully' });
    }

    if (attempt.status === 'paid') {
      // Idempotency: already processed
      return res.status(200).json({ success: true, message: 'Payment already processed' });
    }

    // Mark attempt paid
    attempt.status = 'paid';
    await attempt.save();

    // Create final Order record (store razorpay ids)
    const newOrder = await Order.create({
      user: attempt.user,
      name: attempt.customer?.name || 'Customer',
      email: attempt.customer?.email || 'N/A',
      phone: attempt.customer?.phone || 'N/A',
      address: attempt.customer?.address || 'N/A',
      city: attempt.customer?.city || 'N/A',
      pincode: attempt.customer?.pincode || 'N/A',
      payment: 'Razorpay',
      products: attempt.products || [],
      total: attempt.amount / 100,
      // attach razorpay fields
      razorpay: {
        order_id: rOrderId,
        payment_id: rPaymentId,
        signature: rSignature,
      },
    });

    // Send emails after order is saved — failure does NOT cancel the order
    void sendOrderEmails(newOrder.toObject());

    res.status(200).json({ success: true, message: 'Payment verified and order created', order: newOrder });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};
