export const PAYMENT_ORDER_INDEX_NAME = "razorpay_order_id_unique_v1";
export const PAYMENT_ORDER_INDEX_KEY = Object.freeze({ "razorpay.order_id": 1 });
export const PAYMENT_ORDER_PARTIAL_FILTER = Object.freeze({
    "razorpay.order_id": Object.freeze({ $type: "string" }),
});

const hasExpectedKey = (index) => {
    const keys = Object.entries(index?.key || {});
    return keys.length === 1 &&
        keys[0][0] === "razorpay.order_id" &&
        keys[0][1] === 1;
};

const hasExpectedPartialFilter = (index) => {
    const filter = index?.partialFilterExpression || {};
    const type = filter["razorpay.order_id"]?.$type;
    return Object.keys(filter).length === 1 && type === "string";
};

const isMissingCollectionError = (error) =>
    error?.code === 26 || error?.codeName === "NamespaceNotFound";

const getIndexes = async (collection) => {
    try {
        return await collection.indexes();
    } catch (error) {
        if (isMissingCollectionError(error)) return [];
        throw error;
    }
};

export const isValidPaymentOrderIndex = (index) =>
    hasExpectedKey(index) &&
    index.unique === true &&
    hasExpectedPartialFilter(index);

export const findDuplicateRazorpayOrderIds = async (collection) => {
    try {
        return await collection.aggregate([
            {
                $match: {
                    $expr: {
                        $eq: [{ $type: "$razorpay.order_id" }, "string"],
                    },
                },
            },
            {
                $group: {
                    _id: "$razorpay.order_id",
                    count: { $sum: 1 },
                },
            },
            {
                $match: {
                    count: { $gt: 1 },
                },
            },
        ]).toArray();
    } catch (error) {
        if (isMissingCollectionError(error)) return [];
        throw error;
    }
};

export const assertPaymentOrderIndex = async (collection) => {
    const indexes = await getIndexes(collection);
    const matchingKey = indexes.filter(hasExpectedKey);
    const validIndex = matchingKey.find(isValidPaymentOrderIndex);
    if (validIndex) return validIndex;

    if (matchingKey.length) {
        throw new Error(
            "The Razorpay order ID index exists with incompatible options"
        );
    }
    throw new Error("The required unique Razorpay order ID index is missing");
};

export const ensurePaymentOrderIndex = async (collection) => {
    const duplicates = await findDuplicateRazorpayOrderIds(collection);
    if (duplicates.length) {
        const summary = duplicates
            .map(({ _id, count }) => `${_id} (${count})`)
            .join(", ");
        throw new Error(`Duplicate Razorpay order IDs must be resolved first: ${summary}`);
    }

    const indexes = await getIndexes(collection);
    const matchingKey = indexes.filter(hasExpectedKey);
    const validIndex = matchingKey.find(isValidPaymentOrderIndex);
    if (validIndex) return validIndex;

    if (matchingKey.length) {
        throw new Error(
            "The Razorpay order ID index exists with incompatible options; no index was changed"
        );
    }

    await collection.createIndex(PAYMENT_ORDER_INDEX_KEY, {
        name: PAYMENT_ORDER_INDEX_NAME,
        unique: true,
        partialFilterExpression: PAYMENT_ORDER_PARTIAL_FILTER,
    });
    return assertPaymentOrderIndex(collection);
};
