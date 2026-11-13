import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendCustomerOrderEmail, sendOrderEmails } from "../src/utils/emailService.js";
import { getNotificationIdempotencyKey } from "../src/utils/notificationDelivery.utils.js";

const createMockOrder = () => ({
    _id: "order-test-1",
    name: "Test Customer",
    email: "customer@example.test",
    phone: "15551112222",
    address: "Test address",
    city: "Test city",
    pincode: "00000",
    payment: "Razorpay",
    products: [{ id: 1, name: "Test product", price: 10, quantity: 1 }],
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

const createMockOrderModel = (order) => ({
    async findOneAndUpdate(filter, update) {
        if (filter._id !== order._id) return null;
        const statusPath = Object.keys(update.$set).find((path) =>
            path.endsWith(".status")
        );
        const statePath = statusPath.slice(0, -".status".length);
        const state = getPath(order, statePath);
        if (!["pending", "failed"].includes(state.status) || state.attemptCount >= 5) {
            return null;
        }
        for (const [path, value] of Object.entries(update.$set)) {
            setPath(order, path, value);
        }
        for (const [path, value] of Object.entries(update.$inc || {})) {
            setPath(order, path, getPath(order, path) + value);
        }
        return order;
    },
    async updateOne(filter, update) {
        const tokenPath = Object.keys(filter).find((path) =>
            path.endsWith(".leaseToken")
        );
        const statePath = tokenPath.slice(0, -".leaseToken".length);
        if (
            filter._id !== order._id ||
            getPath(order, tokenPath) !== filter[tokenPath] ||
            !["sending", "unknown"].includes(getPath(order, `${statePath}.status`))
        ) {
            return { modifiedCount: 0 };
        }
        for (const [path, value] of Object.entries(update.$set || {})) {
            setPath(order, path, value);
        }
        return { modifiedCount: 1 };
    },
});

describe("Isolated order email notification tests", () => {
    it("does not contact a provider for an invalid customer email", async () => {
        const result = await sendCustomerOrderEmail({
            ...createMockOrder(),
            email: "not-an-email",
        });
        assert.equal(result.success, false);
        assert.equal(result.reason, "invalid_email");
    });

    it("does not fail when called without an order", async () => {
        const result = await sendOrderEmails(null);
        assert.equal(result.success, false);
        assert.equal(result.reason, "no_order");
    });

    it("attempts recipients independently and preserves successful legacy flags", async () => {
        const order = createMockOrder();
        const model = createMockOrderModel(order);
        let ownerKey;
        let customerKey;

        const result = await sendOrderEmails(order, {
            orderModel: model,
            sendOwner: async (_order, { idempotencyKey }) => {
                ownerKey = idempotencyKey;
                return { success: true, outcome: "sent", messageId: "owner-id" };
            },
            sendCustomer: async (_order, { idempotencyKey }) => {
                customerKey = idempotencyKey;
                return { success: false, outcome: "failed", error: "provider rejected" };
            },
        });

        assert.equal(result.owner.outcome, "sent");
        assert.equal(result.customer.outcome, "failed");
        assert.equal(order.emailsSent.owner, true);
        assert.equal(order.emailsSent.customer, false);
        assert.ok(ownerKey.startsWith("artstore-"));
        assert.ok(customerKey.startsWith("artstore-"));
        assert.equal(ownerKey, getNotificationIdempotencyKey(order._id, "ownerEmail"));
        assert.notEqual(ownerKey, customerKey);
    });
});
