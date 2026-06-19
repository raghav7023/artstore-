// ==========================================
// auth.routes.js - Authentication Routes
// ==========================================
// Purpose: URL paths define karo aur unhe controller functions se connect karo
// Route = URL + HTTP Method + Controller Function
// Example: POST /api/auth/signup → signup controller chalega

import express from 'express';
import { body } from 'express-validator'; // Input validation ke liye
import { signup, signin, getProfile } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

// Router banao - mini Express app jaisa hai
const router = express.Router();

// ==========================================
// VALIDATION RULES
// ==========================================
// Ye rules check karte hain ki user ne sahi data bheja ya nahi
// Pehle validation hogi, phir controller chalega

// Signup ke liye validation rules
const signupValidation = [
  body('name')
    .trim() // Extra spaces hatao
    .notEmpty() // Empty nahi hona chahiye
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be 2-50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail() // Valid email format check
    .withMessage('Please enter a valid email')
    .normalizeEmail(), // Email ko standard format mein convert karo

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/) // Kam se kam 1 number hona chahiye
    .withMessage('Password must contain at least one number'),

  body('phone')
    .optional() // Phone optional hai
    .isMobilePhone('en-IN') // Indian mobile number format
    .withMessage('Please enter a valid Indian mobile number'),
];

// Signin ke liye validation rules (simple rakhte hain)
const signinValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

// ==========================================
// ROUTES DEFINE KARO
// ==========================================

// POST /api/auth/signup - Naya account banao
// Order: Validation → Controller
router.post('/signup', signupValidation, signup);

// POST /api/auth/signin - Login karo
router.post('/signin', signinValidation, signin);

// GET /api/auth/profile - Apni profile dekho (protected route)
// protect middleware pehle chalega - token check karega
// Agar token valid hai tabhi getProfile chalega
router.get('/profile', protect, getProfile);

export default router;
