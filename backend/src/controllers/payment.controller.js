import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentAttempt from '../models/PaymentAttempt.model.js';
import Order from '../models/Order.model.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../Config.mjs';
import { getDeliveryCharge } from '../config/delivery.config.js';
import { products as catalogProducts } from '../data/products.data.js';
import { sendOrderEmails, verifyEmailConfiguration } from '../utils/emailService.js';
import { sendWhatsAppNotification } from './order.controller.js';

// Lazily initialize Razorpay only if credentials are provided
let razorpay = null;
const getRazorpayInstance = () => {
  if (!razorpay && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    try {
      razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    } catch (err) {
      console.error('Razorpay init error:', err.message);
      razorpay = null;
    }
  }
  return razorpay;
};

// Helper: calculate amount from products array (in paise) and sanitize product data against catalog
const sanitizeAndCalculateAmount = (products) => {
  let total = 0;
  const sanitizedProducts = [];

  for (const p of products) {
    const qty = Math.max(1, Math.floor(Number(p.quantity) || 1));
    const catalogItem = catalogProducts.find((item) => item.id === Number(p.id));

    // Enforce authoritative catalog price if found; otherwise validate p.price
    const price = catalogItem ? Number(catalogItem.price) : Math.max(0, Number(p.price) || 0);
    const name = catalogItem ? catalogItem.name : (p.name || 'Product');
    const image = catalogItem ? catalogItem.image : (p.image || '');
    const category = catalogItem ? catalogItem.category : (p.category || '');
    const subcategory = catalogItem ? catalogItem.subcategory : (p.subcategory || '');

    total += qty * price;
    sanitizedProducts.push({
      id: p.id ? Number(p.id) : undefined,
      name,
      price,
      quantity: qty,
      image,
      category,
      subcategory,
    });
  }

  const delivery = getDeliveryCharge(sanitizedProducts);
  const amountInPaise = Math.round((total + delivery) * 100);
  return { amountInPaise, sanitizedProducts };
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

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    // Determine amount in paise (minimum 100 paise = Rs. 1)
    let amountInPaise = 0;
    let orderProducts = [];
    if (products && Array.isArray(products) && products.length > 0) {
      // Recalculate amount on server against authoritative catalog — do NOT trust frontend prices
      const calculation = sanitizeAndCalculateAmount(products);
      amountInPaise = calculation.amountInPaise;
      orderProducts = calculation.sanitizedProducts;
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

    // Create Razorpay order (receipt max length is 40 chars)
    const options = {
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt: (receipt ? String(receipt) : `rcpt_${Date.now()}`).slice(0, 40),
      payment_capture: 1,
    };

    const rOrder = await rzp.orders.create(options);

    // Save a payment attempt with sanitized products and customer info
    let attempt = null;
    if (userId) {
      attempt = await PaymentAttempt.create({
        user: userId,
        razorpay_order_id: rOrder.id,
        amount: amountInPaise,
        currency: currency || 'INR',
        products: orderProducts.length > 0 ? orderProducts : (products || []),
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

    const expectedBuffer = Buffer.from(generated_signature, 'utf8');
    const receivedBuffer = Buffer.from(rSignature, 'utf8');
    const isSignatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isSignatureValid) {
      console.warn('Invalid Razorpay signature for order', rOrderId);
      await PaymentAttempt.updateOne({ razorpay_order_id: rOrderId }, { status: 'failed' });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find corresponding payment attempt
    const attempt = await PaymentAttempt.findOne({ razorpay_order_id: rOrderId });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Payment attempt not found' });
    }

    // Authorization check: ensure caller owns this attempt
    const currentUserId = req.user?.id || req.user?._id;
    if (attempt.user && currentUserId && attempt.user.toString() !== currentUserId.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized verification attempt' });
    }

    if (attempt.status === 'paid') {
      // Idempotency: return existing order, never duplicate
      const existingOrder = await Order.findOne({ 'razorpay.order_id': rOrderId });
      return res.status(200).json({
        success: true,
        message: 'Payment already processed',
        order: existingOrder,
      });
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
      status: 'Processing',
      // attach razorpay fields
      razorpay: {
        order_id: rOrderId,
        payment_id: rPaymentId,
        signature: rSignature,
      },
    });

    // Send emails and WhatsApp alerts after order is saved — failures do NOT cancel the order
    try {
      const emailResult = await sendOrderEmails(newOrder.toObject());
      console.log('Order notification email dispatch completed:', emailResult);
    } catch (emailErr) {
      console.error('Non-critical email dispatch failure:', emailErr?.message || emailErr);
    }

    try {
      await sendWhatsAppNotification(newOrder.toObject(), 'normal');
    } catch (waErr) {
      console.error('Non-critical WhatsApp dispatch failure:', waErr?.message || waErr);
    }

    res.status(200).json({ success: true, message: 'Payment verified and order created', order: newOrder });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// GET /api/payments/email-health
export const checkEmailHealth = async (req, res) => {
  try {
    const result = await verifyEmailConfiguration();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/resend-email/:orderId
export const resendOrderEmail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Security check: Only allow customer who placed the order or admin
    if (req.user && order.user && req.user._id.toString() !== order.user.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to resend emails for this order' });
    }

    const emailResult = await sendOrderEmails(order.toObject(), { force: true });
    return res.status(200).json({ success: true, message: 'Order emails dispatched', emailResult });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/webhook
// Handles server-side automated payment events (payment.captured, order.paid)
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
    const bodyStr = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const isSignatureValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isSignatureValid) {
      console.warn('⚠️ Webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    console.log(`ℹ️ [Razorpay Webhook] Received verified event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const rOrderId = paymentEntity?.order_id || req.body.payload?.order?.entity?.id;
      const rPaymentId = paymentEntity?.id;

      if (rOrderId) {
        // Enforce idempotency: if order already exists, do not duplicate
        const existingOrder = await Order.findOne({ 'razorpay.order_id': rOrderId });
        if (existingOrder) {
          console.log(`ℹ️ [Webhook] Order already processed for Razorpay Order #${rOrderId}`);
          return res.status(200).json({ success: true, message: 'Order already processed', orderId: existingOrder._id });
        }

        const attempt = await PaymentAttempt.findOne({ razorpay_order_id: rOrderId });
        if (attempt) {
          attempt.status = 'paid';
          await attempt.save();

          const paymentMethodDetail = paymentEntity?.method ? `Razorpay (${paymentEntity.method.toUpperCase()})` : 'Razorpay';

          const newOrder = await Order.create({
            user: attempt.user,
            name: attempt.customer?.name || 'Customer',
            email: attempt.customer?.email || 'N/A',
            phone: attempt.customer?.phone || 'N/A',
            address: attempt.customer?.address || 'N/A',
            city: attempt.customer?.city || 'N/A',
            pincode: attempt.customer?.pincode || 'N/A',
            payment: paymentMethodDetail,
            products: attempt.products || [],
            total: attempt.amount / 100,
            status: 'Processing',
            razorpay: {
              order_id: rOrderId,
              payment_id: rPaymentId || 'webhook_captured',
              signature: signature,
            },
          });

          // Dispatch confirmation emails safely
          try {
            const emailResult = await sendOrderEmails(newOrder.toObject());
            console.log('Webhook order confirmation email dispatch completed:', emailResult);
          } catch (emailErr) {
            console.error('Non-critical email dispatch failure in webhook:', emailErr?.message || emailErr);
          }

          try {
            await sendWhatsAppNotification(newOrder.toObject(), 'normal');
          } catch (waErr) {
            console.error('Non-critical WhatsApp dispatch failure in webhook:', waErr?.message || waErr);
          }

          return res.status(200).json({ success: true, message: 'Payment verified and order created via webhook', orderId: newOrder._id });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook event received' });
  } catch (error) {
    console.error('Webhook Handler Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};
