import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    PAYMENT_ORDER_INDEX_NAME,
    assertPaymentOrderIndex,
    ensurePaymentOrderIndex,
    findDuplicateRazorpayOrderIds,
    isValidPaymentOrderIndex,
} from "../src/utils/paymentOrderIndex.utils.js";
import Order from "../src/models/Order.model.js";

const expectedIndex = () => ({
    name: PAYMENT_ORDER_INDEX_NAME,
    key: { "razorpay.order_id": 1 },
    unique: true,
    partialFilterExpression: {
        "razorpay.order_id": { $type: "string" },
    },
});

const createMockCollection = ({ indexes = [], documents = [] } = {}) => {
    const state = {
        indexes: [...indexes],
        createIndexCalls: 0,
    };
    return {
        state,
        async indexes() {
            return state.indexes;
        },
        async createIndex(key, options) {
            state.createIndexCalls += 1;
            state.indexes.push({ key, ...options });
            return options.name;
        },
        aggregate(pipeline) {
            const typeMatch = pipeline[0].$match.$expr;
            assert.deepEqual(typeMatch, {
                $eq: [{ $type: "$razorpay.order_id" }, "string"],
            });

            const counts = new Map();
            for (const document of documents) {
                const id = document.razorpay?.order_id;
                if (typeof id === "string") {
                    counts.set(id, (counts.get(id) || 0) + 1);
                }
            }
            const duplicates = [...counts]
                .filter(([, count]) => count > 1)
                .map(([_id, count]) => ({ _id, count }));
            return { toArray: async () => duplicates };
        },
    };
};

describe("Razorpay payment index verification", () => {
    it("accepts only the unique string partial index", () => {
        assert.equal(isValidPaymentOrderIndex(expectedIndex()), true);
        assert.equal(
            isValidPaymentOrderIndex({
                ...expectedIndex(),
                partialFilterExpression: {},
            }),
            false
        );
        assert.equal(isValidPaymentOrderIndex({ ...expectedIndex(), unique: false }), false);
    });

    it("declares the same payment index without automatic index creation", () => {
        const [key, options] = Order.schema.indexes().find(([indexKey]) =>
            Object.prototype.hasOwnProperty.call(indexKey, "razorpay.order_id")
        );
        assert.deepEqual(key, { "razorpay.order_id": 1 });
        assert.equal(options.unique, true);
        assert.deepEqual(options.partialFilterExpression, {
            "razorpay.order_id": { $type: "string" },
        });
        assert.equal(Order.schema.options.autoIndex, false);
    });

    it("fails closed when the index is missing or incompatible", async () => {
        await assert.rejects(
            assertPaymentOrderIndex(createMockCollection()),
            /index is missing/
        );
        await assert.rejects(
            assertPaymentOrderIndex(createMockCollection({
                indexes: [{ ...expectedIndex(), unique: false }],
            })),
            /incompatible options/
        );
    });

    it("creates and verifies the index only when it is missing", async () => {
        const collection = createMockCollection();
        const created = await ensurePaymentOrderIndex(collection);

        assert.equal(created.name, PAYMENT_ORDER_INDEX_NAME);
        assert.equal(collection.state.createIndexCalls, 1);

        const alreadyPresent = await ensurePaymentOrderIndex(collection);
        assert.equal(alreadyPresent.name, PAYMENT_ORDER_INDEX_NAME);
        assert.equal(collection.state.createIndexCalls, 1);
    });

    it("detects duplicate string IDs while ignoring null, missing, and non-string IDs", async () => {
        const collection = createMockCollection({
            documents: [
                { razorpay: { order_id: "duplicate-order" } },
                { razorpay: { order_id: "duplicate-order" } },
                { razorpay: { order_id: null } },
                { razorpay: { order_id: 123 } },
                { razorpay: {} },
                {},
            ],
        });

        assert.deepEqual(await findDuplicateRazorpayOrderIds(collection), [
            { _id: "duplicate-order", count: 2 },
        ]);
        await assert.rejects(
            ensurePaymentOrderIndex(collection),
            /duplicate-order \(2\)/
        );
        assert.equal(collection.state.createIndexCalls, 0);
    });
});
