import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    claimNotification,
    getNotificationRetryAt,
    MAX_NOTIFICATION_ATTEMPTS,
    recoverExpiredNotificationLeases,
    sanitizeNotificationError,
    settleNotification,
} from "../src/utils/notificationDelivery.utils.js";
import { sendWhatsAppNotification } from "../src/controllers/order.controller.js";
import { sendOrderEmails } from "../src/utils/emailService.js";
import { runNotificationWorkerOnce } from "../src/workers/orderNotification.worker.js";

const createOrder = () => ({
    _id: "order-1",
    name: "Test customer",
    email: "customer@example.test",
    phone: "15551112222",
    address: "Test address",
    city: "Test city",
    pincode: "00000",
    payment: "Razorpay",
    products: [{ name: "Test item", quantity: 1 }],
    total: 10,
    emailsSent: { customer: false, owner: false },
    notifications: {
        customerEmail: { status: "pending", attemptCount: 0 },
        ownerEmail: { status: "pending", attemptCount: 0 },
        whatsapp: { status: "pending", attemptCount: 0 },
    },
});

const getPath = (object, path) =>
    path.split(".").reduce((value, key) => value?.[key], object);

const setPath = (object, path, value) => {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const parent = keys.reduce((value, key) => value[key] ||= {}, object);
    parent[lastKey] = value;
};

const createMockOrderModel = (initialOrder = createOrder()) => {
    const order = initialOrder;
    const matches = (filter) => {
        if (filter._id !== undefined && filter._id !== order._id) return false;
        if (filter.$or) {
            const due = filter.$or.some((clause) =>
                Object.entries(clause).some(([path, condition]) => {
                    const value = getPath(order, path);
                    if (condition === null) return value == null;
                    if ("$exists" in condition) return condition.$exists === (value !== undefined);
                    if ("$lte" in condition) return value == null || value <= condition.$lte;
                    return value === condition;
                })
            );
            if (!due) return false;
        }

        return Object.entries(filter).every(([path, condition]) => {
            if (path === "_id" || path === "$or") return true;
            const value = getPath(order, path);
            if (condition && typeof condition === "object" && "$in" in condition) {
                return condition.$in.includes(value);
            }
            if (condition && typeof condition === "object" && "$lt" in condition) {
                return value < condition.$lt;
            }
            if (condition && typeof condition === "object" && "$lte" in condition) {
                return value <= condition.$lte;
            }
            return value === condition;
        });
    };

    return {
        order,
        async findOneAndUpdate(filter, update) {
            if (!matches(filter)) return null;
            for (const [path, value] of Object.entries(update.$set || {})) {
                setPath(order, path, value);
            }
            for (const [path, value] of Object.entries(update.$inc || {})) {
                setPath(order, path, (getPath(order, path) || 0) + value);
            }
            return JSON.parse(JSON.stringify(order));
        },
        async updateOne(filter, update) {
            if (!matches(filter)) return { modifiedCount: 0 };
            for (const [path, value] of Object.entries(update.$set || {})) {
                setPath(order, path, value);
            }
            return { modifiedCount: 1 };
        },
        async updateMany(filter, update) {
            if (!matches(filter)) return { modifiedCount: 0 };
            for (const [path, value] of Object.entries(update.$set || {})) {
                setPath(order, path, value);
            }
            return { modifiedCount: 1 };
        },
    };
};

describe("notification delivery claims", () => {
    it("allows only one concurrent claim for a recipient", async () => {
        const model = createMockOrderModel();
        const claims = await Promise.all([
            claimNotification(model, "order-1", "customerEmail"),
            claimNotification(model, "order-1", "customerEmail"),
        ]);

        assert.equal(claims.filter(Boolean).length, 1);
        assert.equal(model.order.notifications.customerEmail.attemptCount, 1);
        assert.equal(model.order.notifications.customerEmail.status, "sending");
    });

    it("claims customer and owner emails independently", async () => {
        const model = createMockOrderModel();
        const customer = await claimNotification(model, "order-1", "customerEmail");
        const owner = await claimNotification(model, "order-1", "ownerEmail");

        assert.ok(customer);
        assert.ok(owner);
        assert.notEqual(customer.token, owner.token);
    });

    it("retries a definite failure only after its scheduled time", async () => {
        const model = createMockOrderModel();
        const now = new Date("2026-01-01T00:00:00Z");
        const claim = await claimNotification(model, "order-1", "customerEmail", { now });
        await settleNotification(model, "order-1", "customerEmail", claim.token, "failed", {
            now,
            attemptCount: claim.attemptCount,
            error: "provider rejected request",
            random: () => 0.5,
        });

        const retryAt = model.order.notifications.customerEmail.nextAttemptAt;
        assert.equal(model.order.notifications.customerEmail.status, "failed");
        assert.equal(
            await claimNotification(model, "order-1", "customerEmail", { now }),
            null
        );

        const retry = await claimNotification(model, "order-1", "customerEmail", {
            now: retryAt,
        });
        assert.ok(retry);
        assert.equal(retry.attemptCount, 2);
    });

    it("uses exponential backoff and stops at the configured attempt bound", async () => {
        const now = Date.now();
        assert.equal(getNotificationRetryAt(1, now, () => 0.5).getTime() - now, 30000);
        assert.equal(getNotificationRetryAt(2, now, () => 0.5).getTime() - now, 60000);
        assert.equal(getNotificationRetryAt(3, now, () => 0.5).getTime() - now, 120000);

        const model = createMockOrderModel();
        model.order.notifications.customerEmail.status = "failed";
        model.order.notifications.customerEmail.attemptCount = MAX_NOTIFICATION_ATTEMPTS;
        assert.equal(
            await claimNotification(model, "order-1", "customerEmail"),
            null
        );
    });

    it("does not automatically retry an ambiguous outcome", async () => {
        const model = createMockOrderModel();
        const claim = await claimNotification(model, "order-1", "whatsapp");
        await settleNotification(model, "order-1", "whatsapp", claim.token, "unknown", {
            error: "connection lost",
        });

        assert.equal(model.order.notifications.whatsapp.status, "unknown");
        assert.equal(
            await claimNotification(model, "order-1", "whatsapp", {
                now: new Date(Date.now() + 60 * 60 * 1000),
            }),
            null
        );
    });

    it("recovers an expired lease as unknown without resending", async () => {
        const model = createMockOrderModel();
        const now = new Date("2026-01-01T00:00:00Z");
        const claim = await claimNotification(model, "order-1", "ownerEmail", {
            now,
            leaseMs: 1000,
        });

        const recovered = await recoverExpiredNotificationLeases(model, new Date(now.getTime() + 1001));
        assert.equal(recovered, 1);
        assert.equal(model.order.notifications.ownerEmail.status, "unknown");
        assert.equal(
            await claimNotification(model, "order-1", "ownerEmail", {
                now: new Date(now.getTime() + 2000),
            }),
            null
        );

        await settleNotification(model, "order-1", "ownerEmail", claim.token, "sent", {
            providerMessageId: "provider-id",
        });
        assert.equal(model.order.notifications.ownerEmail.status, "sent");
        assert.equal(model.order.emailsSent.owner, true);
    });

    it("sanitizes credentials and contact details from errors", () => {
        const error = sanitizeNotificationError(
            "Bearer abc123 sent to person@example.com from +1 (555) 123-4567"
        );
        assert.equal(error.includes("abc123"), false);
        assert.equal(error.includes("person@example.com"), false);
        assert.equal(error.includes("555"), false);
    });

    it("prevents duplicate customer and owner emails during concurrent dispatch", async () => {
        const model = createMockOrderModel();
        let ownerSends = 0;
        let customerSends = 0;
        const options = {
            orderModel: model,
            sendOwner: async () => {
                ownerSends += 1;
                return { success: true, outcome: "sent", messageId: "owner-id" };
            },
            sendCustomer: async () => {
                customerSends += 1;
                return { success: true, outcome: "sent", messageId: "customer-id" };
            },
        };

        await Promise.all([
            sendOrderEmails(model.order, options),
            sendOrderEmails(model.order, options),
        ]);

        assert.equal(ownerSends, 1);
        assert.equal(customerSends, 1);
        assert.equal(model.order.emailsSent.owner, true);
        assert.equal(model.order.emailsSent.customer, true);
    });

    it("retries definite email failures without resending successful recipients", async () => {
        const model = createMockOrderModel();
        let customerSends = 0;
        const sendCustomer = async () => {
            customerSends += 1;
            return customerSends === 1
                ? { success: false, outcome: "failed", error: "temporary rejection" }
                : { success: true, outcome: "sent", messageId: "customer-id" };
        };

        const first = await sendOrderEmails(model.order, {
            orderModel: model,
            recipient: "customer",
            sendCustomer,
        });
        const retry = await sendOrderEmails(model.order, {
            orderModel: model,
            recipient: "customer",
            sendCustomer,
            manualRetry: true,
        });

        assert.equal(first.customer.outcome, "failed");
        assert.equal(retry.customer.outcome, "sent");
        assert.equal(customerSends, 2);
        assert.equal(model.order.emailsSent.customer, true);
    });

    it("does not retry ambiguous email delivery", async () => {
        const model = createMockOrderModel();
        let sends = 0;
        const sendCustomer = async () => {
            sends += 1;
            return { success: false, outcome: "unknown", error: "response lost" };
        };

        await sendOrderEmails(model.order, {
            orderModel: model,
            recipient: "customer",
            sendCustomer,
        });
        const retry = await sendOrderEmails(model.order, {
            orderModel: model,
            recipient: "customer",
            sendCustomer,
            manualRetry: true,
        });

        assert.equal(sends, 1);
        assert.equal(model.order.notifications.customerEmail.status, "unknown");
        assert.equal(retry.customer.reason, "unknown");
    });

    it("prevents duplicate WhatsApp messages from concurrent dispatch", async () => {
        const model = createMockOrderModel();
        let fetchCalls = 0;
        const options = {
            orderModel: model,
            whatsappConfig: {
                accessToken: "test-token",
                phoneNumberId: "test-phone-id",
                toNumber: "15550000000",
            },
            fetchImpl: async () => {
                fetchCalls += 1;
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ messages: [{ id: "whatsapp-id" }] }),
                };
            },
        };

        await Promise.all([
            sendWhatsAppNotification(model.order, "normal", options),
            sendWhatsAppNotification(model.order, "normal", options),
        ]);

        assert.equal(fetchCalls, 1);
        assert.equal(model.order.notifications.whatsapp.status, "sent");
    });

    it("marks WhatsApp transport failures unknown and does not retry them", async () => {
        const model = createMockOrderModel();
        let fetchCalls = 0;
        const options = {
            orderModel: model,
            whatsappConfig: {
                accessToken: "test-token",
                phoneNumberId: "test-phone-id",
                toNumber: "15550000000",
            },
            fetchImpl: async () => {
                fetchCalls += 1;
                throw new Error("socket closed");
            },
        };

        const first = await sendWhatsAppNotification(model.order, "normal", options);
        const second = await sendWhatsAppNotification(model.order, "normal", options);

        assert.equal(first.outcome, "unknown");
        assert.equal(second.skipped, true);
        assert.equal(fetchCalls, 1);
        assert.equal(model.order.notifications.whatsapp.status, "unknown");
    });

    it("times out a WhatsApp request as unknown without blocking or retrying", async () => {
        const model = createMockOrderModel();
        let requestSignal;
        let whatsappResult;
        const options = {
            orderModel: model,
            whatsappConfig: {
                accessToken: "test-token",
                phoneNumberId: "test-phone-id",
                toNumber: "15550000000",
            },
            timeoutMs: 10,
            fetchImpl: async (_url, { signal }) => {
                requestSignal = signal;
                return new Promise(() => {});
            },
        };
        model.find = () => [model.order];

        const workerResult = await runNotificationWorkerOnce({
            orderModel: model,
            emailSender: async () => ({ success: true }),
            whatsappSender: async (order) => {
                whatsappResult = await sendWhatsAppNotification(order, "normal", options);
                return whatsappResult;
            },
        });
        const retry = await sendWhatsAppNotification(model.order, "normal", options);

        assert.equal(workerResult.ordersProcessed, 1);
        assert.equal(whatsappResult.outcome, "unknown");
        assert.equal(requestSignal.aborted, true);
        assert.equal(model.order.notifications.whatsapp.status, "unknown");
        assert.equal(retry.skipped, true);
    });

    it("retries a definite WhatsApp rejection after its backoff", async () => {
        const model = createMockOrderModel();
        let fetchCalls = 0;
        const options = {
            orderModel: model,
            whatsappConfig: {
                accessToken: "test-token",
                phoneNumberId: "test-phone-id",
                toNumber: "15550000000",
            },
            fetchImpl: async () => {
                fetchCalls += 1;
                return fetchCalls === 1
                    ? {
                        ok: false,
                        status: 429,
                        json: async () => ({ error: { message: "rate limited" } }),
                    }
                    : {
                        ok: true,
                        status: 200,
                        json: async () => ({ messages: [{ id: "whatsapp-retry-id" }] }),
                    };
            },
        };

        const first = await sendWhatsAppNotification(model.order, "normal", options);
        const retryAt = model.order.notifications.whatsapp.nextAttemptAt;
        const second = await sendWhatsAppNotification(model.order, "normal", {
            ...options,
            now: retryAt,
        });

        assert.equal(first.outcome, "failed");
        assert.equal(second.outcome, "sent");
        assert.equal(fetchCalls, 2);
    });

    it("reports notification worker failures without stopping the batch", async () => {
        const model = createMockOrderModel();
        model.find = () => [model.order];

        const result = await runNotificationWorkerOnce({
            orderModel: model,
            emailSender: async () => {
                throw new Error("worker email error");
            },
            whatsappSender: async () => ({ success: true }),
        });

        assert.equal(result.ordersProcessed, 1);
        assert.equal(result.failures, 1);
    });
});
