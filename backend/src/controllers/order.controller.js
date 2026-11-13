import Order from "../models/Order.model.js";
import { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO_NUMBER } from '../../Config.mjs';
import {
    claimNotification,
    sanitizeNotificationError,
    settleNotification,
} from '../utils/notificationDelivery.utils.js';

const WHATSAPP_REQUEST_TIMEOUT_MS = 15 * 1000;

const sendWhatsAppMessage = async (
    orderData,
    {
        fetchImpl = fetch,
        type = 'normal',
        accessToken = WHATSAPP_ACCESS_TOKEN,
        phoneNumberId = WHATSAPP_PHONE_NUMBER_ID,
        toNumber = WHATSAPP_TO_NUMBER,
        apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0',
        timeoutMs = WHATSAPP_REQUEST_TIMEOUT_MS,
    } = {}
) => {
    if (!accessToken || !phoneNumberId || !toNumber) {
        return {
            success: false,
            outcome: 'failed',
            error: 'WhatsApp notification is not configured',
        };
    }

    const controller = new AbortController();
    let timeoutId;
    try {
        const message = type === 'custom'
            ? `🎨 New custom order received\n\nCustomer: ${orderData.name}\nEmail: ${orderData.email}\nPhone: ${orderData.phone}\nProduct: ${orderData.product}\nColor: ${orderData.color || 'N/A'}\nBudget: ₹${orderData.budget || 0}\nDelivery: ${orderData.delivery || 'N/A'}\nMessage: ${orderData.message}`
            : `🛍️ New order received\n\nCustomer: ${orderData.name}\nEmail: ${orderData.email}\nPhone: ${orderData.phone}\nAddress: ${orderData.address}, ${orderData.city} - ${orderData.pincode}\nPayment: ${orderData.payment}\nProducts: ${orderData.products.map((p) => `${p.name} x ${p.quantity}`).join(', ')}\nTotal: ₹${orderData.total}`;

        const request = (async () => {
            const response = await fetchImpl(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: toNumber,
                    type: 'text',
                    text: {
                        body: message,
                    },
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                let providerError = `WhatsApp provider returned HTTP ${response.status}`;
                try {
                    const data = await response.json();
                    providerError = data?.error?.message || providerError;
                } catch {
                    // The HTTP status still determines the provider outcome.
                }
                return {
                    success: false,
                    outcome: response.status >= 500 ? 'unknown' : 'failed',
                    error: sanitizeNotificationError(providerError),
                };
            }

            let data = {};
            try {
                data = await response.json();
            } catch {
                // A successful HTTP response confirms provider acceptance.
            }
            return {
                success: true,
                outcome: 'sent',
                messageId: data?.messages?.[0]?.id,
            };
        })();

        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('WhatsApp request timed out'));
            }, timeoutMs);
        });

        return await Promise.race([request, timeout]);
    } catch (error) {
        return {
            success: false,
            outcome: 'unknown',
            error: sanitizeNotificationError(error),
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

export const sendWhatsAppNotification = async (
    orderData,
    type = 'normal',
    {
        orderModel = Order,
        fetchImpl = fetch,
        whatsappConfig,
        now = new Date(),
        timeoutMs = WHATSAPP_REQUEST_TIMEOUT_MS,
    } = {}
) => {
    if (type === 'custom') {
        return sendWhatsAppMessage(orderData, {
            ...whatsappConfig,
            fetchImpl,
            type,
            timeoutMs,
        });
    }

    if (type !== 'normal' || !orderData?._id) {
        return { success: false, skipped: true, reason: 'persistent_order_required' };
    }

    if (!orderData.notifications?.whatsapp) {
        return { success: false, skipped: true, reason: 'legacy_delivery_state_missing' };
    }

    const claim = await claimNotification(orderModel, orderData._id, 'whatsapp', { now });
    if (!claim) {
        const status = orderData.notifications.whatsapp.status;
        return {
            success: status === 'sent',
            skipped: true,
            reason: status || 'not_claimable',
            ...(status === 'unknown' ? { outcome: 'unknown' } : {}),
        };
    }

    const result = await sendWhatsAppMessage(claim.order, {
        ...whatsappConfig,
        fetchImpl,
        timeoutMs,
    });
    await settleNotification(orderModel, orderData._id, 'whatsapp', claim.token, result.outcome, {
        now: new Date(),
        error: result.error,
        providerMessageId: result.messageId,
        attemptCount: claim.attemptCount,
    });
    return result;
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

        const orders = await Order.find({
            user: req.user.id,
        }).sort({
            createdAt: -1,
        });

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

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        return res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        if (error?.name === "CastError") {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        console.error("Error fetching order details:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch order details.",
        });
    }
};