import { describe, it } from "node:test";
import assert from "node:assert/strict";
import AuditLog from "../src/models/AuditLog.model.js";
import EmailLog from "../src/models/EmailLog.model.js";
import Order from "../src/models/Order.model.js";
import { retryEmail } from "../src/controllers/admin.controller.js";

describe("admin email notification retries", () => {
    it("does not update EmailLog when another worker owns the notification claim", async (t) => {
        let saveCalls = 0;
        const emailLog = {
            _id: "email-log-1",
            emailType: "order_confirmation_customer",
            status: "failed",
            attemptCount: 1,
            maxAttempts: 3,
            relatedOrder: "order-1",
            async save() {
                saveCalls += 1;
            },
        };
        const order = {
            _id: "order-1",
            notifications: {
                customerEmail: { status: "failed", attemptCount: 1 },
            },
            emailsSent: { customer: false },
            toObject() {
                return {
                    _id: this._id,
                    notifications: this.notifications,
                    emailsSent: this.emailsSent,
                };
            },
        };

        t.mock.method(EmailLog, "findById", async () => emailLog);
        t.mock.method(Order, "findById", async () => order);
        t.mock.method(Order, "findOneAndUpdate", async () => null);
        t.mock.method(AuditLog, "create", async () => ({}));

        const res = {
            statusCode: 200,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                this.body = body;
                return this;
            },
        };

        await retryEmail(
            {
                params: { id: emailLog._id },
                user: { id: "admin-1" },
                ip: "127.0.0.1",
            },
            res
        );

        assert.equal(res.statusCode, 409);
        assert.equal(saveCalls, 0);
        assert.equal(emailLog.attemptCount, 1);
        assert.equal(emailLog.status, "failed");
    });
});
