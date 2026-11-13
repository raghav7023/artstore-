import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentAttempt from '../models/PaymentAttempt.model.js';
import Order from '../models/Order.model.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from '../../Config.mjs';
import {
  InvalidProductError,
  PAYMENT_CURRENCY,
  getOrCreateOrder,
  paymentMatchesAttempt,
  sanitizeAndCalculateAmount,
} from '../utils/paymentOrder.utils.js';
import { sendOrderEmails, verifyEmailConfiguration } from '../utils/emailService.js';
import { dispatchOrderNotifications } from '../workers/orderNotification.worker.js';

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
      state,
      pincode,
      payment, // payment method selected
      products,
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
    } else {
      return res.status(400).json({ success: false, message: 'Products array is required' });
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
      currency: PAYMENT_CURRENCY,
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
        currency: PAYMENT_CURRENCY,
        products: orderProducts.length > 0 ? orderProducts : (products || []),
        customer: {
          name: name || '',
          email: email || '',
          phone: phone || '',
          address: address || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
        },
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
    if (error instanceof InvalidProductError) {
      return res.status(400).json({ success: false, message: error.message });
    }
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

    const paymentAttempt = await PaymentAttempt.findOne({ razorpay_order_id: rOrderId });
    if (!paymentAttempt) {
      return res.status(404).json({ success: false, message: 'Payment attempt not found' });
    }

    const currentUserId = req.user?.id || req.user?._id;
    if (paymentAttempt.user && currentUserId && paymentAttempt.user.toString() !== currentUserId.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized verification attempt' });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    let gatewayPayment;
    try {
      gatewayPayment = await rzp.payments.fetch(rPaymentId);
    } catch (error) {
      console.error('Razorpay payment lookup error:', error.message);
      return res.status(502).json({ success: false, message: 'Unable to verify payment with payment gateway' });
    }

    if (!paymentMatchesAttempt(gatewayPayment, paymentAttempt)) {
      return res.status(400).json({ success: false, message: 'Payment details do not match the payment attempt' });
    }

    const wasAlreadyPaid = paymentAttempt.status === 'paid';
    const { order: newOrder, created } = await getOrCreateOrder(Order, {
      user: paymentAttempt.user,
      name: paymentAttempt.customer?.name || 'Customer',
      email: paymentAttempt.customer?.email || 'N/A',
      phone: paymentAttempt.customer?.phone || 'N/A',
      address: paymentAttempt.customer?.address || 'N/A',
      city: paymentAttempt.customer?.city || 'N/A',
      state: paymentAttempt.customer?.state || '',
      pincode: paymentAttempt.customer?.pincode || 'N/A',
      payment: 'Razorpay',
      products: paymentAttempt.products || [],
      total: paymentAttempt.amount / 100,
      status: 'Processing',
      razorpay: {
        order_id: rOrderId,
        payment_id: rPaymentId,
        signature: rSignature,
      },
    });

    const updatedAttempt = await PaymentAttempt.findOneAndUpdate(
      { razorpay_order_id: rOrderId, status: { $ne: 'paid' } },
      { $set: { status: 'paid' } },
      { new: true }
    );

    if (updatedAttempt || created || wasAlreadyPaid) {
      void dispatchOrderNotifications(newOrder._id).catch((notificationError) => {
        console.error('Non-critical order notification dispatch failure:', notificationError?.message || notificationError);
      });
    }

    res.status(200).json({
      success: true,
      message: created ? 'Payment verified and order created' : 'Payment already processed',
      order: newOrder,
    });
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
    const callerId = req.user?.id || req.user?._id;
    if (req.user && order.user && callerId?.toString() !== order.user.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to resend emails for this order' });
    }

    const emailResult = await sendOrderEmails(order.toObject(), { manualRetry: true });
    const ambiguous = [emailResult.owner, emailResult.customer].some(
      (result) => result.outcome === 'unknown' || result.reason === 'sending'
    );
    if (ambiguous) {
      return res.status(409).json({
        success: false,
        message: 'One or more email delivery outcomes require provider reconciliation.',
        emailResult,
      });
    }
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
    const rawBodyStr = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyStr)
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
      const orderEntity = req.body.payload?.order?.entity;
      const rOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rPaymentId = paymentEntity?.id;

      if (rOrderId) {
        const paymentAttempt = await PaymentAttempt.findOne({ razorpay_order_id: rOrderId });
        if (!paymentAttempt) {
          return res.status(200).json({ success: true, message: 'Payment attempt not found' });
        }

        const webhookPayment = paymentEntity || {
          order_id: orderEntity?.id,
          amount: orderEntity?.amount_paid,
          currency: orderEntity?.currency,
          status: orderEntity?.status === 'paid' ? 'captured' : orderEntity?.status,
        };
        if (!paymentMatchesAttempt(webhookPayment, paymentAttempt)) {
          console.warn('Razorpay webhook payment does not match payment attempt', rOrderId);
          return res.status(400).json({ success: false, message: 'Payment details do not match the payment attempt' });
        }

        const wasAlreadyPaid = paymentAttempt.status === 'paid';
        const paymentMethodDetail = paymentEntity?.method ? `Razorpay (${paymentEntity.method.toUpperCase()})` : 'Razorpay';
        const { order: newOrder, created } = await getOrCreateOrder(Order, {
          user: paymentAttempt.user,
          name: paymentAttempt.customer?.name || 'Customer',
          email: paymentAttempt.customer?.email || 'N/A',
          phone: paymentAttempt.customer?.phone || 'N/A',
          address: paymentAttempt.customer?.address || 'N/A',
          city: paymentAttempt.customer?.city || 'N/A',
          state: paymentAttempt.customer?.state || '',
          pincode: paymentAttempt.customer?.pincode || 'N/A',
          payment: paymentMethodDetail,
          products: paymentAttempt.products || [],
          total: paymentAttempt.amount / 100,
          status: 'Processing',
          razorpay: {
            order_id: rOrderId,
            payment_id: rPaymentId || 'webhook_captured',
            signature,
          },
        });

        const updatedAttempt = await PaymentAttempt.findOneAndUpdate(
          { razorpay_order_id: rOrderId, status: { $ne: 'paid' } },
          { $set: { status: 'paid' } },
          { new: true }
        );

        if (updatedAttempt || created || wasAlreadyPaid) {
          void dispatchOrderNotifications(newOrder._id).catch((notificationError) => {
            console.error('Non-critical webhook notification dispatch failure:', notificationError?.message || notificationError);
          });
        }

        return res.status(200).json({
          success: true,
          message: created ? 'Payment verified and order created via webhook' : 'Order already processed',
          orderId: newOrder._id,
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook event received' });
  } catch (error) {
    console.error('Webhook Handler Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};
