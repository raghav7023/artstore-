import express from "express";
import {
    createOrder,
    getOrders,
} from "../controllers/order.controller.js";
import { protect } from "../middleware/auth.middleware.js";


const router = express.Router();

// Customer order place kar sakta hai (login required)
router.post("/", protect, createOrder);

// Sirf admin saare orders dekh sakta hai
router.get("/", protect, getOrders);

export default router;