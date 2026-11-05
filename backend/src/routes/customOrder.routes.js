import express from 'express';
import { body } from 'express-validator';
import { createCustomOrder, getCustomOrders } from '../controllers/customOrder.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

const customOrderValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('product').trim().notEmpty().withMessage('Please select a product type'),
  body('message').trim().notEmpty().withMessage('Please describe your order'),
];

router.post('/', protect, customOrderValidation, createCustomOrder);
router.get('/', protect, getCustomOrders);

export default router;
