import Order from "../models/Order.model.js";
import { sendWhatsAppNotification } from "../controllers/order.controller.js";
import { sendOrderEmails } from "../utils/emailService.js";
import {
    MAX_NOTIFICATION_ATTEMPTS,
    NOTIFICATION_TYPES,
    recoverExpiredNotificationLeases,
    sanitizeNotificationError,
} from "../utils/notificationDelivery.utils.js";

const BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 15 * 1000;
let workerTimer = null;
let workerRunning = false;

const buildDueNotificationsQuery = (now) => ({
    $or: NOTIFICATION_TYPES.map((type) => ({
        [`notifications.${type}.status`]: { $in: ["pending", "failed"] },
        [`notifications.${type}.attemptCount`]: { $lt: MAX_NOTIFICATION_ATTEMPTS },
        $or: [
            { [`notifications.${type}.nextAttemptAt`]: { $exists: false } },
            { [`notifications.${type}.nextAttemptAt`]: null },
            { [`notifications.${type}.nextAttemptAt`]: { $lte: now } },
        ],
    })),
});

export const runNotificationWorkerOnce = async ({
    orderModel = Order,
    emailSender = sendOrderEmails,
    whatsappSender = sendWhatsAppNotification,
    now = new Date(),
    batchSize = BATCH_SIZE,
} = {}) => {
    const expiredLeasesRecovered = await recoverExpiredNotificationLeases(orderModel, now);
    let query = orderModel.find(buildDueNotificationsQuery(now));
    if (!Array.isArray(query) && typeof query.sort === "function") {
        query = query.sort({ createdAt: 1 });
    }
    if (!Array.isArray(query) && typeof query.limit === "function") {
        query = query.limit(batchSize);
    }
    const orders = await query;

    const results = await Promise.allSettled(
        orders.map(async (order) => {
            const orderData = order.toObject ? order.toObject() : order;
            return Promise.allSettled([
                emailSender(order),
                whatsappSender(orderData),
            ]);
        })
    );

    const failedResults = [];
    for (const result of results) {
        if (result.status === "rejected") {
            failedResults.push(result);
        } else {
            failedResults.push(...result.value.filter((delivery) => delivery.status === "rejected"));
        }
    }

    for (const failure of failedResults) {
        console.error(
            "[NotificationWorker] Order notification processing failed:",
            sanitizeNotificationError(failure.reason)
        );
    }

    return {
        ordersProcessed: orders.length,
        expiredLeasesRecovered,
        failures: failedResults.length,
    };
};

export const dispatchOrderNotifications = async (orderId, options = {}) => {
    const orderModel = options.orderModel || Order;
    const order = await orderModel.findById(orderId);
    if (!order) throw new Error("Order not found for notification dispatch");

    const emailSender = options.emailSender || sendOrderEmails;
    const whatsappSender = options.whatsappSender || sendWhatsAppNotification;
    const orderData = order.toObject ? order.toObject() : order;
    const results = await Promise.allSettled([
        emailSender(order),
        whatsappSender(orderData),
    ]);

    for (const result of results) {
        if (result.status === "rejected") {
            console.error(
                "[NotificationWorker] Immediate notification dispatch failed:",
                sanitizeNotificationError(result.reason)
            );
        }
    }
    return results;
};

export const startNotificationWorker = ({ intervalMs = DEFAULT_INTERVAL_MS } = {}) => {
    if (workerTimer) return () => clearInterval(workerTimer);

    const tick = async () => {
        if (workerRunning) return;
        workerRunning = true;
        try {
            await runNotificationWorkerOnce();
        } catch (error) {
            console.error(
                "[NotificationWorker] Poll failed:",
                sanitizeNotificationError(error)
            );
        } finally {
            workerRunning = false;
        }
    };

    workerTimer = setInterval(tick, intervalMs);
    workerTimer.unref?.();
    void tick();

    return () => {
        clearInterval(workerTimer);
        workerTimer = null;
    };
};
