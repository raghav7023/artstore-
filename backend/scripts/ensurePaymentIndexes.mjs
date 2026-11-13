import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";
import Order from "../src/models/Order.model.js";
import { ensurePaymentOrderIndex } from "../src/utils/paymentOrderIndex.utils.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "..", ".env") });
dotenv.config();

export const runPaymentIndexCheck = async (connectionUri = process.env.MONGODB_URL) => {
    if (!connectionUri) {
        throw new Error("MONGODB_URL is required to verify payment indexes");
    }

    try {
        await mongoose.connect(connectionUri, { autoIndex: false });
        const index = await ensurePaymentOrderIndex(Order.collection);
        console.log(`Verified payment order index: ${index.name}`);
        return index;
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    runPaymentIndexCheck().catch((error) => {
        console.error("Payment index check failed:", error.message);
        process.exitCode = 1;
    });
}
