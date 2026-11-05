import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware.js';
import { adminOnly } from '../middleware/admin.middleware.js';
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUserStatus,
  getAdminOrders,
  getOrderById,
  updateOrderStatus,
  getAdminPayments,
  getAdminEmails,
  getEmailById,
  retryEmail,
  getAdminProducts,
  getSystemSettings,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Sensitive operation rate limiter: maximum 30 retry/status operations per 15 min
const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many admin action requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All admin routes require authentication + admin role verified against DB
router.use(protect, adminOnly);

// Dashboard Overview
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', adminActionLimiter, updateUserStatus);

// Product Catalog
router.get('/products', getAdminProducts);

// Order Management
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getOrderById);
router.patch('/orders/:id/status', adminActionLimiter, updateOrderStatus);

// Payment Management
router.get('/payments', getAdminPayments);

// Email Management
router.get('/emails', getAdminEmails);
router.get('/emails/:id', getEmailById);
router.post('/emails/:id/retry', adminActionLimiter, retryEmail);

// System Settings & Diagnostics
router.get('/settings', getSystemSettings);

export default router;
