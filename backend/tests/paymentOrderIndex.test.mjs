import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    PAYMENT_ORDER_INDEX_NAME,
    PAYMENT_ATTEMPT_ORDER_INDEX_NAME,
    assertPaymentOrderIndex,
    assertPaymentAttemptOrderIndex,
    ensurePaymentAttemptOrderIndex,
    ensurePaymentOrderIndex,
    findDuplicateRazorpayOrderIds,
    findPaymentAttemptOrderIdIssues,
    isValidPaymentAttemptOrderIndex,
    isValidPaymentOrderIndex,
} from "../src/utils/paymentOrderIndex.utils.js";
import Order from "../src/models/Order.model.js";
import PaymentAttempt from "../src/models/PaymentAttempt.model.js";

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

const expectedPaymentAttemptIndex = () => ({
    name: PAYMENT_ATTEMPT_ORDER_INDEX_NAME,
    key: { razorpay_order_id: 1 },
    unique: true,
});

const createMockPaymentAttemptCollection = ({ indexes = [], documents = [] } = {}) => {
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
            assert.deepEqual(pipeline[0], {
                $group: {
                    _id: "$razorpay_order_id",
                    valueType: { $first: { $type: "$razorpay_order_id" } },
                    count: { $sum: 1 },
                },
            });

            const groups = new Map();
            for (const document of documents) {
                const value = document.razorpay_order_id;
                const valueType = typeof value === "string"
                    ? "string"
                    : value === null
                        ? "null"
                        : value === undefined
                            ? (Object.hasOwn(document, "razorpay_order_id") ? "null" : "missing")
                            : typeof value;
                const key = valueType === "missing" || valueType === "null" ? null : value;
                const group = groups.get(key) || { _id: key, valueType, count: 0 };
                group.count += 1;
                groups.set(key, group);
            }
            const issues = [...groups.values()].filter(
                ({ valueType, count }) => valueType !== "string" || count > 1
            );
            return { toArray: async () => issues };
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

    it("declares PaymentAttempt order ID uniqueness without automatic index creation", () => {
        const [key, options] = PaymentAttempt.schema.indexes().find(([indexKey]) =>
            Object.prototype.hasOwnProperty.call(indexKey, "razorpay_order_id")
        );
        assert.deepEqual(key, { razorpay_order_id: 1 });
        assert.equal(options.unique, true);
        assert.equal(PaymentAttempt.schema.options.autoIndex, false);
        assert.equal(isValidPaymentAttemptOrderIndex(expectedPaymentAttemptIndex()), true);
        assert.equal(
            isValidPaymentAttemptOrderIndex({
                ...expectedPaymentAttemptIndex(),
                partialFilterExpression: { razorpay_order_id: { $type: "string" } },
            }),
            false
        );
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

    it("creates and verifies the full unique PaymentAttempt index idempotently", async () => {
        const collection = createMockPaymentAttemptCollection({
            documents: [
                { razorpay_order_id: "order_1" },
                { razorpay_order_id: "order_2" },
            ],
        });

        const created = await ensurePaymentAttemptOrderIndex(collection);
        assert.equal(created.name, PAYMENT_ATTEMPT_ORDER_INDEX_NAME);
        assert.equal(collection.state.createIndexCalls, 1);
        assert.equal(
            (await ensurePaymentAttemptOrderIndex(collection)).name,
            PAYMENT_ATTEMPT_ORDER_INDEX_NAME
        );
        assert.equal(collection.state.createIndexCalls, 1);
        assert.equal(await assertPaymentAttemptOrderIndex(collection), created);
    });

    it("rejects duplicate, null, and missing PaymentAttempt IDs without changing records", async () => {
        const documents = [
            { razorpay_order_id: "duplicate" },
            { razorpay_order_id: "duplicate" },
            { razorpay_order_id: null },
            {},
        ];
        const collection = createMockPaymentAttemptCollection({ documents });

        assert.equal((await findPaymentAttemptOrderIdIssues(collection)).length, 2);
        await assert.rejects(
            ensurePaymentAttemptOrderIndex(collection),
            /must be valid and unique/
        );
        assert.equal(collection.state.createIndexCalls, 0);
        assert.equal(documents.length, 4);
    });

    it("fails closed for an existing incompatible PaymentAttempt index", async () => {
        const collection = createMockPaymentAttemptCollection({
            indexes: [{ ...expectedPaymentAttemptIndex(), unique: false }],
        });
        await assert.rejects(
            ensurePaymentAttemptOrderIndex(collection),
            /incompatible options/
        );
        assert.equal(collection.state.createIndexCalls, 0);
    });
});
