import crypto from "crypto";

export const NOTIFICATION_TYPES = Object.freeze([
    "customerEmail",
    "ownerEmail",
    "whatsapp",
]);

export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_LEASE_MS = 60 * 1000;
const RETRY_BASE_MS = 30 * 1000;
const RETRY_MAX_MS = 60 * 60 * 1000;

const getNotificationPath = (type) => {
    if (!NOTIFICATION_TYPES.includes(type)) {
        throw new TypeError(`Unsupported notification type: ${type}`);
    }
    return `notifications.${type}`;
};

const getPathValue = (value, path) =>
    path.split(".").reduce((current, key) => current?.[key], value);

export const sanitizeNotificationError = (error) =>
    String(error?.message || error || "Unknown notification error")
        .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|re|rk|rzp)_[A-Za-z0-9_-]+\b/gi, "[redacted]")
        .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
        .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
        .replace(/[\r\n\t]+/g, " ")
        .slice(0, 500);

export const getNotificationRetryAt = (
    attemptCount,
    now = Date.now(),
    random = Math.random
) => {
    const exponent = Math.max(0, Number(attemptCount) - 1);
    const baseDelay = Math.min(RETRY_BASE_MS * (2 ** exponent), RETRY_MAX_MS);
    const jitteredDelay = Math.round(baseDelay * (0.8 + random() * 0.4));
    return new Date(now + Math.min(jitteredDelay, RETRY_MAX_MS));
};

export const claimNotification = async (
    orderModel,
    orderId,
    type,
    { now = new Date(), leaseMs = NOTIFICATION_LEASE_MS, manualRetry = false } = {}
) => {
    const path = getNotificationPath(type);
    const token = crypto.randomBytes(16).toString("hex");
    const claimFilter = {
        _id: orderId,
        [`${path}.status`]: { $in: ["pending", "failed"] },
        [`${path}.attemptCount`]: { $lt: MAX_NOTIFICATION_ATTEMPTS },
    };

    if (!manualRetry) {
        claimFilter.$or = [
            { [`${path}.nextAttemptAt`]: { $exists: false } },
            { [`${path}.nextAttemptAt`]: null },
            { [`${path}.nextAttemptAt`]: { $lte: now } },
        ];
    }

    const order = await orderModel.findOneAndUpdate(
        claimFilter,
        {
            $set: {
                [`${path}.status`]: "sending",
                [`${path}.leaseToken`]: token,
                [`${path}.leaseUntil`]: new Date(now.getTime() + leaseMs),
                [`${path}.lastAttemptAt`]: now,
                [`${path}.lastError`]: "",
            },
            $inc: { [`${path}.attemptCount`]: 1 },
        },
        { new: true }
    );

    if (!order) return null;

    return {
        order,
        token,
        attemptCount: getPathValue(order, `${path}.attemptCount`),
    };
};

export const initializeLegacyEmailRetry = async (
    orderModel,
    orderId,
    type
) => {
    if (type !== "customerEmail" && type !== "ownerEmail") {
        throw new TypeError("Only email notifications can use legacy retry initialization");
    }

    const recipient = type === "customerEmail" ? "customer" : "owner";
    return orderModel.updateOne(
        {
            _id: orderId,
            [`notifications.${type}`]: { $exists: false },
            [`emailsSent.${recipient}`]: { $ne: true },
        },
        {
            $set: {
                [`notifications.${type}.status`]: "failed",
                [`notifications.${type}.attemptCount`]: 0,
                [`notifications.${type}.lastError`]:
                    "Legacy email retry explicitly requested",
            },
        }
    );
};

export const getNotificationIdempotencyKey = (orderId, type) => {
    const digest = crypto
        .createHash("sha256")
        .update(`artstore:${orderId}:${type}`)
        .digest("hex");
    return `artstore-${digest}`;
};

export const settleNotification = async (
    orderModel,
    orderId,
    type,
    token,
    outcome,
    { now = new Date(), error, providerMessageId, attemptCount = 1, random } = {}
) => {
    if (!["sent", "failed", "unknown"].includes(outcome)) {
        throw new TypeError(`Unsupported notification outcome: ${outcome}`);
    }

    const path = getNotificationPath(type);
    const update = {
        $set: {
            [`${path}.status`]: outcome,
            [`${path}.leaseUntil`]: null,
            [`${path}.lastError`]: outcome === "sent" ? "" : sanitizeNotificationError(error),
        },
    };

    if (outcome === "sent") {
        update.$set[`${path}.providerMessageId`] = providerMessageId || "";
        if (type === "customerEmail" || type === "ownerEmail") {
            const recipient = type === "customerEmail" ? "customer" : "owner";
            update.$set[`emailsSent.${recipient}`] = true;
            update.$set["emailsSent.sentAt"] = now;
        }
    } else if (outcome === "failed") {
        update.$set[`${path}.nextAttemptAt`] = getNotificationRetryAt(
            attemptCount,
            now.getTime(),
            random
        );
    } else {
        update.$set[`${path}.nextAttemptAt`] = null;
    }

    return orderModel.updateOne(
        {
            _id: orderId,
            [`${path}.leaseToken`]: token,
            [`${path}.status`]: { $in: ["sending", "unknown"] },
        },
        update
    );
};

export const recoverExpiredNotificationLeases = async (orderModel, now = new Date()) => {
    const results = await Promise.all(
        NOTIFICATION_TYPES.map((type) => {
            const path = getNotificationPath(type);
            return orderModel.updateMany(
                {
                    [`${path}.status`]: "sending",
                    [`${path}.leaseUntil`]: { $lte: now },
                },
                {
                    $set: {
                        [`${path}.status`]: "unknown",
                        [`${path}.leaseUntil`]: null,
                        [`${path}.nextAttemptAt`]: null,
                        [`${path}.lastError`]:
                            "Worker lease expired before the provider outcome was recorded",
                    },
                }
            );
        })
    );
    return results.reduce(
        (total, result) => total + (result.modifiedCount || result.nModified || 0),
        0
    );
};
