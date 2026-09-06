// ============================================================
// src/utils/emailService.js -- Automatic Order Email Notifications
//
// Features:
// 1. sendOwnerOrderEmail(order)    - Sends email to store owner
// 2. sendCustomerOrderEmail(order) - Sends email to customer
// 3. sendOrderEmails(order)        - Reusable helper to send both
//
// Implementation details:
// - Uses Nodemailer + Gmail SMTP (smtp.gmail.com:587, STARTTLS)
// - Fire-and-forget / non-blocking: never fails the order if email fails
// - Duplicate prevention with an in-memory processed orders set
// - Uses saved order data (grand total and derived delivery = total - subtotal)
// - Never logs passwords or sensitive credentials
// ============================================================

import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASSWORD, ORDER_NOTIFICATION_EMAIL } from '../../Config.mjs';

// Cache to prevent duplicate emails for the same order
const processedOrders = new Set();

// Helper to create Nodemailer transporter
const createTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS / STARTTLS
    auth: {
      user: EMAIL_USER.trim(),
      pass: EMAIL_PASSWORD.trim().replace(/\s+/g, ''),
    },
  });
};

// Helper: Calculate subtotal from products
const calculateSubtotal = (products = []) => {
  return products.reduce(
    (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
    0
  );
};

// Helper: Format products list for email text
const formatProductsText = (products = []) => {
  if (!products.length) return '  (No products listed)';
  return products
    .map(
      (p) =>
        `  * ${p.name || 'Product'} | Qty: ${p.quantity} | Price: Rs.${p.price} | Total: Rs.${(Number(p.price) || 0) * (Number(p.quantity) || 0)}`
    )
    .join('\n');
};

// ============================================================
// 1. STORE OWNER ORDER EMAIL
// ============================================================
export const sendOwnerOrderEmail = async (order) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Email skipped: EMAIL_USER or EMAIL_PASSWORD not configured.');
      return;
    }

    const ownerEmail = ORDER_NOTIFICATION_EMAIL || EMAIL_USER;
    if (!ownerEmail) {
      console.warn('Store owner email not specified. Skipping owner notification.');
      return;
    }

    const orderId = order._id ? order._id.toString() : 'N/A';
    const customerName = order.name || 'N/A';
    const customerEmail = order.email || 'N/A';
    const customerPhone = order.phone || 'N/A';
    const deliveryAddress = `${order.address || ''}, ${order.city || ''} - ${order.pincode || ''}`;
    const products = order.products || [];
    const subtotal = calculateSubtotal(products);
    const grandTotal = Number(order.total) || subtotal;
    const deliveryCharge = Math.max(0, grandTotal - subtotal);
    const paymentMethod = order.payment || 'N/A';
    const paymentStatus = order.payment === 'Razorpay' ? 'Paid (Razorpay)' : 'Pending (Cash on Delivery)';

    const mailOptions = {
      from: `"Art Store" <${EMAIL_USER}>`,
      to: ownerEmail,
      subject: `🛍️ New Order Received - Art Store #${orderId}`,
      text: `
New Order Received!

You have received a new order on Art Store.

----------------------------------------------
ORDER DETAILS
----------------------------------------------
Order ID       : #${orderId}
Payment Method : ${paymentMethod}
Payment Status : ${paymentStatus}

----------------------------------------------
CUSTOMER INFORMATION
----------------------------------------------
Name  : ${customerName}
Email : ${customerEmail}
Phone : ${customerPhone}

Delivery Address:
${deliveryAddress}

----------------------------------------------
ORDERED PRODUCTS
----------------------------------------------
${formatProductsText(products)}

----------------------------------------------
PAYMENT SUMMARY
----------------------------------------------
Subtotal        : Rs.${subtotal}
Delivery Charge : Rs.${deliveryCharge}
Grand Total     : Rs.${grandTotal}
----------------------------------------------
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Store owner notification sent for Order #${orderId} to ${ownerEmail}`);
  } catch (error) {
    console.error(`Failed to send store owner email for Order #${order?._id || 'unknown'}:`, error.message);
  }
};

// ============================================================
// 2. CUSTOMER ORDER CONFIRMATION EMAIL
// ============================================================
export const sendCustomerOrderEmail = async (order) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Email skipped: EMAIL_USER or EMAIL_PASSWORD not configured.');
      return;
    }

    const customerEmail = order.email;
    if (!customerEmail) {
      console.warn(`Customer email missing for Order #${order?._id || 'unknown'}. Skipping customer email.`);
      return;
    }

    const orderId = order._id ? order._id.toString() : 'N/A';
    const customerName = order.name || 'Customer';
    const deliveryAddress = `${order.address || ''}, ${order.city || ''} - ${order.pincode || ''}`;
    const products = order.products || [];
    const subtotal = calculateSubtotal(products);
    const grandTotal = Number(order.total) || subtotal;
    const deliveryCharge = Math.max(0, grandTotal - subtotal);
    const paymentMethod = order.payment || 'N/A';
    const paymentStatus = order.payment === 'Razorpay' ? 'Paid (Razorpay)' : 'Pending (Cash on Delivery)';

    const mailOptions = {
      from: `"Art Store" <${EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation - Art Store #${orderId}`,
      text: `
Dear ${customerName},

Thank you for your order!
Your order has been placed successfully and is currently being processed with love and care.

----------------------------------------------
ORDER DETAILS
----------------------------------------------
Order ID       : #${orderId}
Payment Method : ${paymentMethod}
Payment Status : ${paymentStatus}

----------------------------------------------
ORDERED PRODUCTS
----------------------------------------------
${formatProductsText(products)}

----------------------------------------------
PAYMENT SUMMARY
----------------------------------------------
Subtotal        : Rs.${subtotal}
Delivery Charge : Rs.${deliveryCharge}
Grand Total     : Rs.${grandTotal}

----------------------------------------------
DELIVERY ADDRESS
----------------------------------------------
${deliveryAddress}

----------------------------------------------
We will pack your items carefully and update you as your order ships.
If you have any questions, feel free to reply to this email.

Warm regards,
Art Store
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Customer confirmation email sent for Order #${orderId} to ${customerEmail}`);
  } catch (error) {
    console.error(`Failed to send customer confirmation email for Order #${order?._id || 'unknown'}:`, error.message);
  }
};

// ============================================================
// 3. COMBINED HELPER: sendOrderEmails(order)
// ============================================================
export const sendOrderEmails = async (order) => {
  if (!order) return;

  const orderId = order._id ? order._id.toString() : null;

  // Prevent duplicate sends for the same order
  if (orderId) {
    if (processedOrders.has(orderId)) {
      console.log(`Order #${orderId} emails already processed. Skipping duplicate.`);
      return;
    }
    processedOrders.add(orderId);
    const timer = setTimeout(() => processedOrders.delete(orderId), 3600000);
    if (timer.unref) timer.unref();
  }

  // Send both emails in parallel, neither can throw to the caller
  await Promise.allSettled([
    sendOwnerOrderEmail(order),
    sendCustomerOrderEmail(order),
  ]);
};

// ============================================================
// 4. VERIFY EMAIL CONFIGURATION (SAFE - NEVER LOGS SECRETS)
// ============================================================
export const verifyEmailConfiguration = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, message: 'EMAIL_USER or EMAIL_PASSWORD not configured in environment.' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Gmail SMTP authentication succeeded.' };
  } catch (error) {
    return { success: false, message: error.message, code: error.code };
  }
};
