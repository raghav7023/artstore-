import Order from "../models/Order.model.js";
import { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO_NUMBER } from '../../Config.mjs';
import { getDeliveryCharge } from '../config/delivery.config.js';
import { sendOrderEmails } from '../utils/emailService.js';

export const sendWhatsAppNotification = async (orderData, type = 'normal') => {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TO_NUMBER) {
        console.log('WhatsApp notification skipped: missing credentials.');
        return;
    }

    try {
        const message = type === 'custom'
            ? `🎨 New custom order received\n\nCustomer: ${orderData.name}\nEmail: ${orderData.email}\nPhone: ${orderData.phone}\nProduct: ${orderData.product}\nColor: ${orderData.color || 'N/A'}\nBudget: ₹${orderData.budget || 0}\nDelivery: ${orderData.delivery || 'N/A'}\nMessage: ${orderData.message}`
            : `🛍️ New order received\n\nCustomer: ${orderData.name}\nEmail: ${orderData.email}\nPhone: ${orderData.phone}\nAddress: ${orderData.address}, ${orderData.city} - ${orderData.pincode}\nPayment: ${orderData.payment}\nProducts: ${orderData.products.map((p) => `${p.name} x ${p.quantity}`).join(', ')}\nTotal: ₹${orderData.total}`;

        const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: WHATSAPP_TO_NUMBER,
                type: 'text',
                text: {
                    body: message,
                },
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('WhatsApp API error:', data);
            return;
        }

        console.log('WhatsApp notification sent successfully.', data);
    } catch (error) {
        console.error('WhatsApp notification failed:', error.message);
    }
};

// ==========================================
// Create New Order (Disabled for Direct Call)
// POST /api/orders
// All real orders must be created via verified Razorpay payment (/api/payments/verify)
// ==========================================

export const createOrder = async (req, res) => {
    return res.status(400).json({
        success: false,
        message: 'Direct order placement without payment verification is disabled. All orders must be placed through the verified online payment gateway (/api/payments/create-order).',
    });
};
// ==========================================
// Get All Orders
// GET /api/orders
// ==========================================

export const getOrders = async (req, res) => {

    try {

        let orders;

        if (req.user.role === "admin") {

            // Admin -> sabke orders
            orders = await Order.find().sort({
                createdAt: -1,
            });

        } else {

            // User -> sirf apne orders
            orders = await Order.find({
                user: req.user.id,
            }).sort({
                createdAt: -1,
            });

        }

        res.status(200).json({
            success: true,
            orders,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch orders.",
        });

    }

};