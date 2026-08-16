import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentAttempt from '../models/PaymentAttempt.model.js';
import Order from '../models/Order.model.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../Config.mjs';

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
  // convert to paise
  return Math.round(total * 100);
};

// POST /api/payments/create-order
export const createPaymentOrder = async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }
    const userId = req.user.id;

    const {
      name,
      email,
      phone,
      address,
      city,
      pincode,
      payment, // payment method selected
      products,
    } = req.body;

    // Basic validation
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Products are required' });
    }

    // Recalculate amount on server — do NOT trust frontend total
    const amountInPaise = calculateAmountFromProducts(products);

    // If Cash on Delivery, create order directly (no Razorpay)
    if (payment === 'Cash on Delivery' || payment === 'cod') {
      const newOrder = await Order.create({
        user: userId,
        name,
        email,
        phone,
        address,
        city,
        pincode,
        payment: 'Cash on Delivery',
        products,
        total: amountInPaise / 100,
      });

      return res.status(201).json({ success: true, message: 'Order placed (COD)', order: newOrder });
    }

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
    };

    const rOrder = await razorpay.orders.create(options);

    // Save a payment attempt to track and later create final order after verification
    const attempt = await PaymentAttempt.create({
      user: userId,
      razorpay_order_id: rOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      products,
      customer: { name, email, phone, address, city, pincode },
      status: 'created',
    });

    // Return necessary info to frontend (key id + order)
    res.status(200).json({
      success: true,
      key: RAZORPAY_KEY_ID,
      order: rOrder,
      attemptId: attempt._id,
    });
  } catch (error) {
    console.error('Create Payment Order Error:', error);
    res.status(500).json({ success: false, message: 'Unable to create payment order' });
  }
};

// POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Compute expected signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.warn('Invalid Razorpay signature', { razorpay_order_id, razorpay_payment_id });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find corresponding payment attempt
    const attempt = await PaymentAttempt.findOne({ razorpay_order_id });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Payment attempt not found' });
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
      name: attempt.customer.name,
      email: attempt.customer.email,
      phone: attempt.customer.phone,
      address: attempt.customer.address,
      city: attempt.customer.city,
      pincode: attempt.customer.pincode,
      payment: 'Razorpay',
      products: attempt.products,
      total: attempt.amount / 100,
      // attach razorpay fields
      razorpay: {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature,
      },
    });

    res.status(200).json({ success: true, message: 'Payment verified and order created', order: newOrder });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};
