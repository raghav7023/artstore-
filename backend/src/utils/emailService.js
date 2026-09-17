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
    const paymentMethod = order.payment || 'Razorpay';
    const paymentStatus = order.payment === 'Razorpay' ? 'Paid (Razorpay)' : 'Pending';
    const orderStatus = order.status || 'Processing';
    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

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
Order Date     : ${orderDate}
Order Status   : ${orderStatus}
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d2420; line-height: 1.5;">
          <h2 style="color: #2f5bd3; border-bottom: 2px solid #2f5bd3; padding-bottom: 8px;">🛍️ New Order Received</h2>
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Order Date:</strong> ${orderDate}</p>
          <p><strong>Order Status:</strong> <span style="color: #10b981; font-weight: bold;">${orderStatus}</span></p>
          <p><strong>Payment Status:</strong> ${paymentStatus} (${paymentMethod})</p>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 16px 0;" />
          <h3 style="color: #2f5bd3;">Customer Details</h3>
          <p><strong>Name:</strong> ${customerName}<br />
             <strong>Email:</strong> ${customerEmail}<br />
             <strong>Phone:</strong> ${customerPhone}<br />
             <strong>Address:</strong> ${deliveryAddress}</p>
          <hr style="border: none; border-top: 1px solid #e8e0d8; margin: 16px 0;" />
          <h3 style="color: #2f5bd3;">Ordered Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f0eb; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Item</th>
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Qty</th>
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">${p.name || 'Product'}</td>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">${p.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">₹${p.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 16px; text-align: right; font-size: 1.1rem;">
            <strong>Grand Total: ₹${grandTotal}</strong> (Subtotal: ₹${subtotal}, Delivery: ₹${deliveryCharge})
          </p>
        </div>
      `,
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
    const paymentMethod = order.payment || 'Razorpay';
    const paymentStatus = order.payment === 'Razorpay' ? 'Paid (Razorpay)' : 'Pending';
    const orderStatus = order.status || 'Processing';
    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

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
Order Date     : ${orderDate}
Order Status   : ${orderStatus}
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2d2420; line-height: 1.5;">
          <h2 style="color: #2f5bd3; border-bottom: 2px solid #2f5bd3; padding-bottom: 8px;">✨ Order Confirmed!</h2>
          <p>Dear <strong>${customerName}</strong>,</p>
          <p>Thank you for supporting our craft! Your order has been placed successfully and is being prepared with care.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="margin: 4px 0;"><strong>Order Date:</strong> ${orderDate}</p>
            <p style="margin: 4px 0;"><strong>Order Status:</strong> <span style="color: #10b981; font-weight: bold;">${orderStatus}</span></p>
            <p style="margin: 4px 0;"><strong>Payment Status:</strong> ${paymentStatus}</p>
          </div>
          <h3 style="color: #2f5bd3;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f0eb; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Item</th>
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Qty</th>
                <th style="padding: 8px; border: 1px solid #e8e0d8;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">${p.name || 'Product'}</td>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">${p.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #e8e0d8;">₹${p.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 16px; text-align: right; font-size: 1.1rem;">
            <strong>Grand Total: ₹${grandTotal}</strong> (Delivery: ₹${deliveryCharge})
          </p>
          <h3 style="color: #2f5bd3;">Delivery Address</h3>
          <p style="background: #f9f9f9; padding: 12px; border-radius: 6px;">${deliveryAddress}</p>
          <p style="color: #64748b; font-size: 0.9rem; margin-top: 24px;">
            If you have any questions, feel free to reply directly to this email.<br />
            Warm regards,<br />
            <strong>Art Store Team 🧶</strong>
          </p>
        </div>
      `,
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
// 4. STORE OWNER CUSTOM ORDER EMAIL
// ============================================================
export const sendCustomOrderOwnerEmail = async (customOrder) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Custom order email skipped: EMAIL_USER or EMAIL_PASSWORD not configured.');
      return;
    }

    const ownerEmail = ORDER_NOTIFICATION_EMAIL || EMAIL_USER;
    if (!ownerEmail) {
      console.warn('Store owner email not specified. Skipping custom order owner notification.');
      return;
    }

    const orderId = customOrder._id ? customOrder._id.toString() : 'N/A';
    const customerName = customOrder.name || 'N/A';
    const customerEmail = customOrder.email || 'N/A';
    const customerPhone = customOrder.phone || 'N/A';
    const productType = customOrder.product || 'N/A';
    const preferredColor = customOrder.color || 'Not specified';
    const deliveryDate = customOrder.delivery || 'Not specified';
    const description = customOrder.message || 'No description provided';
    const budget = customOrder.budget ? `Rs.${customOrder.budget}` : 'N/A';
    const createdAt = customOrder.createdAt
      ? new Date(customOrder.createdAt).toLocaleString()
      : new Date().toLocaleString();

    let imageInfo = 'None provided';
    if (customOrder.image && typeof customOrder.image === 'string' && customOrder.image.trim() !== '') {
      if (customOrder.image.startsWith('http')) {
        imageInfo = customOrder.image;
      } else if (customOrder.image.startsWith('blob:') || customOrder.image.startsWith('data:')) {
        imageInfo = 'Reference image attached/selected by customer in form';
      } else {
        imageInfo = customOrder.image;
      }
    }

    const mailOptions = {
      from: `"Art Store" <${EMAIL_USER}>`,
      to: ownerEmail,
      subject: `New Custom Order Received - Art Store #${orderId}`,
      text: `
New Custom Order Received!

A customer has submitted a new custom order on Art Store.

----------------------------------------------
CUSTOM ORDER DETAILS
----------------------------------------------
Custom Order ID : #${orderId}
Product / Type  : ${productType}
Color           : ${preferredColor}
Delivery Date   : ${deliveryDate}
Budget          : ${budget}
Created At      : ${createdAt}

----------------------------------------------
CUSTOMER INFORMATION
----------------------------------------------
Customer Name   : ${customerName}
Customer Email  : ${customerEmail}
Customer Phone  : ${customerPhone}

----------------------------------------------
CUSTOMER MESSAGE / DESCRIPTION
----------------------------------------------
${description}

----------------------------------------------
REFERENCE IMAGE INFORMATION
----------------------------------------------
${imageInfo}
----------------------------------------------
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Custom order owner email sent successfully for Order #${orderId} to ${ownerEmail}`);
    return info;
  } catch (error) {
    console.error(`Custom order owner email failed: ${error.message}`);
  }
};

// ============================================================
// 5. CUSTOMER CUSTOM ORDER CONFIRMATION EMAIL
// ============================================================
export const sendCustomOrderCustomerEmail = async (customOrder) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return;

    const customerEmail = customOrder.email;
    if (!customerEmail) {
      console.warn(`Customer email missing for Custom Order #${customOrder?._id || 'unknown'}. Skipping customer email.`);
      return;
    }

    const orderId = customOrder._id ? customOrder._id.toString() : 'N/A';
    const customerName = customOrder.name || 'Customer';
    const storeContactEmail = ORDER_NOTIFICATION_EMAIL || EMAIL_USER;

    const mailOptions = {
      from: `"Art Store" <${EMAIL_USER}>`,
      to: customerEmail,
      subject: `Custom Order Confirmation - Art Store #${orderId}`,
      text: `
Dear ${customerName},

Thank you for your custom order request!
We have received your custom order (#${orderId}) and our team is currently reviewing your details.

----------------------------------------------
CUSTOM ORDER DETAILS
----------------------------------------------
Custom Order ID : #${orderId}
Product / Type  : ${customOrder.product || 'N/A'}
Color           : ${customOrder.color || 'Not specified'}
Delivery Date   : ${customOrder.delivery || 'Not specified'}

----------------------------------------------
YOUR MESSAGE
----------------------------------------------
${customOrder.message || 'N/A'}

----------------------------------------------
STATUS: REQUEST RECEIVED
----------------------------------------------
We will review your requirements and get in touch with you shortly.

STORE CONTACT:
Email: ${storeContactEmail}

Warm regards,
Art Store Team
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Custom order customer email sent successfully for Order #${orderId} to ${customerEmail}`);
    return info;
  } catch (error) {
    console.error(`Custom order customer email failed: ${error.message}`);
  }
};

// ============================================================
// 6. COMBINED HELPER: sendCustomOrderEmails(customOrder)
// ============================================================
export const sendCustomOrderEmails = async (customOrder) => {
  if (!customOrder) return;

  const orderId = customOrder._id ? customOrder._id.toString() : null;

  // Prevent duplicate sends for the same custom order
  if (orderId) {
    const cacheKey = `custom_${orderId}`;
    if (processedOrders.has(cacheKey)) {
      console.log(`Custom Order #${orderId} emails already processed. Skipping duplicate.`);
      return;
    }
    processedOrders.add(cacheKey);
    const timer = setTimeout(() => processedOrders.delete(cacheKey), 3600000);
    if (timer.unref) timer.unref();
  }

  // Send both emails in parallel, neither can throw to the caller
  await Promise.allSettled([
    sendCustomOrderOwnerEmail(customOrder),
    sendCustomOrderCustomerEmail(customOrder),
  ]);
};

// ============================================================
// 7. VERIFY EMAIL CONFIGURATION (SAFE - NEVER LOGS SECRETS)
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
