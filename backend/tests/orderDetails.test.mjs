import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Order from "../src/models/Order.model.js";
import { getOrderById, getOrders } from "../src/controllers/order.controller.js";

const createResponse = () => ({
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
});

describe("customer order details", () => {
    it("returns an order only when it belongs to the authenticated customer", async (t) => {
        const order = { _id: "order-1", user: "customer-1", total: 25 };
        let query;
        t.mock.method(Order, "findOne", async (filter) => {
            query = filter;
            return filter.user === order.user ? order : null;
        });

        const res = createResponse();
        await getOrderById(
            { params: { id: order._id }, user: { id: "customer-1" } },
            res
        );

        assert.deepEqual(query, { _id: "order-1", user: "customer-1" });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.order, order);
    });

    it("does not reveal an order owned by another customer", async (t) => {
        const order = { _id: "order-1", user: "customer-1" };
        let query;
        t.mock.method(Order, "findOne", async (filter) => {
            query = filter;
            return filter.user === order.user ? order : null;
        });

        const res = createResponse();
        await getOrderById(
            { params: { id: order._id }, user: { id: "customer-2" } },
            res
        );

        assert.deepEqual(query, { _id: "order-1", user: "customer-2" });
        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { success: false, message: "Order not found." });
    });

    it("keeps the existing order listing scoped to the authenticated customer", async (t) => {
        const orders = [{ _id: "order-1" }];
        let query;
        t.mock.method(Order, "find", (filter) => {
            query = filter;
            return { sort: async () => orders };
        });

        const res = createResponse();
        await getOrders({ user: { id: "customer-1" } }, res);

        assert.deepEqual(query, { user: "customer-1" });
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.orders, orders);
    });
});
