import { validationResult } from 'express-validator';
import CustomOrder from '../models/CustomOrder.model.js';
import { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO_NUMBER } from '../../Config.mjs';

const sendWhatsAppNotification = async (orderData) => {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TO_NUMBER) {
    console.log('WhatsApp notification skipped: missing credentials.');
    return;
  }

  try {
    const message = `🎨 New custom order received\n\nCustomer: ${orderData.name}\nEmail: ${orderData.email}\nPhone: ${orderData.phone}\nProduct: ${orderData.product}\nColor: ${orderData.color || 'N/A'}\nBudget: ₹${orderData.budget || 0}\nDelivery: ${orderData.delivery || 'N/A'}\nMessage: ${orderData.message}`;

    const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: WHATSAPP_TO_NUMBER,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return;
    }

    console.log('WhatsApp notification sent successfully.', data);
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
  }
};

export const createCustomOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, phone, product, color, budget, delivery, message, image } = req.body;

    const customOrder = await CustomOrder.create({
      user: req.user.id,
      name,
      email,
      phone,
      product,
      color: color || '',
      budget: Number(budget) || 0,
      delivery: delivery || '',
      message,
      image: image || '',
    });

    await sendWhatsAppNotification(customOrder.toObject ? customOrder.toObject() : customOrder);

    res.status(201).json({
      success: true,
      message: 'Custom order submitted successfully!',
      order: customOrder,
    });
  } catch (error) {
    console.error('Create Custom Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to submit custom order.',
    });
  }
};

export const getCustomOrders = async (req, res) => {
  try {
    let orders;

    if (req.user.role === 'admin') {
      orders = await CustomOrder.find().sort({ createdAt: -1 });
    } else {
      orders = await CustomOrder.find({ user: req.user.id }).sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Get Custom Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch custom orders.',
    });
  }
};
