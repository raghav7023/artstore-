import { getDeliveryCharge } from '../config/delivery.config.js';
import { products as catalogProducts } from '../data/products.data.js';

export const PAYMENT_CURRENCY = 'INR';

export class InvalidProductError extends Error {
  constructor() {
    super('One or more products are not in the catalog');
    this.name = 'InvalidProductError';
  }
}

export const sanitizeAndCalculateAmount = (products) => {
  let total = 0;
  const sanitizedProducts = [];

  for (const product of products) {
    const catalogItem = catalogProducts.find((item) => item.id === Number(product?.id));
    if (!catalogItem) {
      throw new InvalidProductError();
    }

    const quantity = Math.min(100, Math.max(1, Math.floor(Number(product.quantity) || 1)));
    const price = Number(catalogItem.price);

    total += quantity * price;
    sanitizedProducts.push({
      id: catalogItem.id,
      name: catalogItem.name,
      price,
      quantity,
      image: catalogItem.image,
      category: catalogItem.category,
      subcategory: catalogItem.subcategory,
    });
  }

  const delivery = getDeliveryCharge(sanitizedProducts);
  const amountInPaise = Math.round((total + delivery) * 100);
  return { amountInPaise, sanitizedProducts };
};

export const paymentMatchesAttempt = (payment, attempt) =>
  Boolean(
    payment &&
      attempt &&
      payment.order_id === attempt.razorpay_order_id &&
      Number.isSafeInteger(Number(payment.amount)) &&
      Number(payment.amount) === Number(attempt.amount) &&
      payment.currency === PAYMENT_CURRENCY &&
      attempt.currency === PAYMENT_CURRENCY &&
      payment.status === 'captured'
  );

export const getOrCreateOrder = async (OrderModel, orderData) => {
  const query = { 'razorpay.order_id': orderData.razorpay.order_id };
  const existingOrder = await OrderModel.findOne(query);
  if (existingOrder) {
    return { order: existingOrder, created: false };
  }

  try {
    const order = await OrderModel.create({
      ...orderData,
      notifications: orderData.notifications || {
        customerEmail: { status: 'pending', attemptCount: 0 },
        ownerEmail: { status: 'pending', attemptCount: 0 },
        whatsapp: { status: 'pending', attemptCount: 0 },
      },
    });
    return { order, created: true };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const order = await OrderModel.findOne(query);
    if (!order) {
      throw error;
    }
    return { order, created: false };
  }
};
