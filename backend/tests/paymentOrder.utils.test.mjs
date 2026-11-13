import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { products as catalogProducts } from '../src/data/products.data.js';
import {
  InvalidProductError,
  PAYMENT_CURRENCY,
  getOrCreateOrder,
  paymentMatchesAttempt,
  sanitizeAndCalculateAmount,
} from '../src/utils/paymentOrder.utils.js';
import { getDeliveryCharge } from '../src/config/delivery.config.js';

const createMockOrderModel = (initialOrders = [], createOrder = null) => {
  const orders = new Map(
    initialOrders.map((order) => [order.razorpay.order_id, order])
  );
  let createCalls = 0;

  return {
    orders,
    get createCalls() {
      return createCalls;
    },
    async findOne(query) {
      return orders.get(query['razorpay.order_id']) || null;
    },
    async create(order) {
      createCalls += 1;
      if (createOrder) {
        return createOrder(order, orders);
      }
      if (orders.has(order.razorpay.order_id)) {
        const error = new Error('Duplicate Razorpay order ID');
        error.code = 11000;
        throw error;
      }
      const createdOrder = { ...order, _id: `order-${createCalls}` };
      orders.set(order.razorpay.order_id, createdOrder);
      return createdOrder;
    },
  };
};

const createOrderData = (orderId = 'razorpay-order-1') => ({
  total: 125,
  razorpay: { order_id: orderId },
});

describe('Payment order validation', () => {
  it('uses catalog data instead of client-supplied price and product details', () => {
    const catalogItem = catalogProducts[0];
    const result = sanitizeAndCalculateAmount([
      {
        id: catalogItem.id,
        name: 'Manipulated name',
        price: 1,
        image: '/untrusted.jpg',
        category: 'untrusted category',
        quantity: 2,
      },
    ]);

    assert.deepEqual(result.sanitizedProducts[0], {
      id: catalogItem.id,
      name: catalogItem.name,
      price: catalogItem.price,
      quantity: 2,
      image: catalogItem.image,
      category: catalogItem.category,
      subcategory: catalogItem.subcategory,
    });
    assert.equal(
      result.amountInPaise,
      (catalogItem.price * 2 + getDeliveryCharge([catalogItem])) * 100
    );
  });

  it('rejects unknown product IDs even when the request supplies a price', () => {
    assert.throws(
      () => sanitizeAndCalculateAmount([{ id: Number.MAX_SAFE_INTEGER, price: 1 }]),
      InvalidProductError
    );
  });

  it('accepts only a captured payment matching the stored order, amount, and currency', () => {
    const attempt = {
      razorpay_order_id: 'order_123',
      amount: 12500,
      currency: PAYMENT_CURRENCY,
    };

    assert.equal(
      paymentMatchesAttempt({
        order_id: 'order_123',
        amount: 12500,
        currency: 'INR',
        status: 'captured',
      }, attempt),
      true
    );
    assert.equal(
      paymentMatchesAttempt({
        order_id: 'order_123',
        amount: 12499,
        currency: 'INR',
        status: 'captured',
      }, attempt),
      false
    );
    assert.equal(
      paymentMatchesAttempt({
        order_id: 'order_123',
        amount: 12500,
        currency: 'USD',
        status: 'captured',
      }, attempt),
      false
    );
    assert.equal(
      paymentMatchesAttempt({
        order_id: 'order_123',
        amount: 12500,
        currency: 'INR',
        status: 'captured',
      }, { ...attempt, currency: 'USD' }),
      false,
    );
    assert.equal(
      paymentMatchesAttempt({
        order_id: 'order_123',
        amount: 12500,
        currency: 'INR',
        status: 'authorized',
      }, attempt),
      false
    );
  });

  it('creates exactly one order for a successful payment', async () => {
    const OrderModel = createMockOrderModel();
    const result = await getOrCreateOrder(OrderModel, createOrderData());

    assert.equal(result.created, true);
    assert.equal(OrderModel.orders.size, 1);
    assert.equal(OrderModel.createCalls, 1);
    assert.deepEqual(result.order.notifications, {
      customerEmail: { status: 'pending', attemptCount: 0 },
      ownerEmail: { status: 'pending', attemptCount: 0 },
      whatsapp: { status: 'pending', attemptCount: 0 },
    });
  });

  it('does not create duplicate orders when a webhook is delivered more than once', async () => {
    const OrderModel = createMockOrderModel([], async (order, orders) => {
      await new Promise((resolve) => setImmediate(resolve));
      if (orders.has(order.razorpay.order_id)) {
        const error = new Error('Duplicate Razorpay order ID');
        error.code = 11000;
        throw error;
      }
      const createdOrder = { ...order, _id: 'order-1' };
      orders.set(order.razorpay.order_id, createdOrder);
      return createdOrder;
    });

    const results = await Promise.all([
      getOrCreateOrder(OrderModel, createOrderData()),
      getOrCreateOrder(OrderModel, createOrderData()),
    ]);

    assert.equal(OrderModel.orders.size, 1);
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(results[0].order._id, results[1].order._id);
  });

  it('can recover when order creation fails before persisting', async () => {
    let shouldFail = true;
    const OrderModel = createMockOrderModel([], async (order, orders) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('Temporary order storage failure');
      }
      const createdOrder = { ...order, _id: 'order-recovered' };
      orders.set(order.razorpay.order_id, createdOrder);
      return createdOrder;
    });

    await assert.rejects(getOrCreateOrder(OrderModel, createOrderData()), /Temporary order storage failure/);
    assert.equal(OrderModel.orders.size, 0);

    const retry = await getOrCreateOrder(OrderModel, createOrderData());
    assert.equal(retry.created, true);
    assert.equal(OrderModel.orders.size, 1);
  });

  it('reuses an existing paid order instead of creating another', async () => {
    const existingOrder = {
      ...createOrderData(),
      _id: 'already-paid-order',
    };
    const OrderModel = createMockOrderModel([existingOrder]);
    const result = await getOrCreateOrder(OrderModel, createOrderData());

    assert.equal(result.created, false);
    assert.equal(result.order._id, existingOrder._id);
    assert.equal(OrderModel.createCalls, 0);
    assert.equal(OrderModel.orders.size, 1);
  });
});
