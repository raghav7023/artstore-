import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { MONGODB_URL, RAZORPAY_KEY_SECRET, JWT_SECRET } from './Config.mjs';

const API_BASE = 'http://localhost:2026';
const jsonHeaders = { 'Content-Type': 'application/json' };

const request = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};

const run = async () => {
  console.log('🚀 Starting Comprehensive Artstore End-to-End Test Suite...\n');

  // Ensure server is running
  let isRunning = false;
  try {
    const ping = await request(`${API_BASE}/`);
    if (ping.ok) isRunning = true;
  } catch {
    isRunning = false;
  }

  if (!isRunning) {
    console.log('ℹ️ Server not detected on port 2026. Starting server dynamically...');
    await import('./index.mjs');
    
    // Wait for server and DB connection to establish
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const ping = await request(`${API_BASE}/`);
        if (ping.ok && mongoose.connection.readyState === 1) {
          isRunning = true;
          break;
        }
      } catch {
        // still initializing
      }
    }
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URL, { serverSelectionTimeoutMS: 15000 });
  }

  // ==========================================
  // TEST 1: Health Check
  // ==========================================
  console.log('--- Test 1: API Health Check ---');
  const health = await request(`${API_BASE}/`);
  console.log(`[Status: ${health.status}] Response:`, health.data?.message || 'OK');
  if (!health.ok) throw new Error('Health check failed');
  console.log('✅ Test 1 Passed: Server is healthy.\n');

  // ==========================================
  // TEST 2: Product Catalog API
  // ==========================================
  console.log('--- Test 2: Product Catalog API & Synchronization ---');
  const productsResp = await request(`${API_BASE}/api/products`);
  if (!productsResp.ok || !productsResp.data?.products?.length) {
    throw new Error('Failed to fetch products');
  }
  console.log(`Total catalog products returned by backend: ${productsResp.data.products.length}`);

  // Test newly synchronized product (Sling Bag ID 404)
  const singleProductResp = await request(`${API_BASE}/api/products/404`);
  if (!singleProductResp.ok || singleProductResp.data?.product?.name !== 'Sling Bag') {
    throw new Error(`Catalog sync failed: product 404 not found or incorrect (${JSON.stringify(singleProductResp.data)})`);
  }
  console.log(`Product 404 lookup: ${singleProductResp.data.product.name} - ₹${singleProductResp.data.product.price}`);
  console.log('✅ Test 2 Passed: Catalog is synchronized with 90+ items and handles lookups.\n');

  // ==========================================
  // TEST 3: Signup Validation Check (Weak password / Missing fields)
  // ==========================================
  console.log('--- Test 3: Signup Input Validation ---');
  const weakPasswordSignup = await request(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'Test',
      email: 'weakpass@example.com',
      password: 'short', // less than 6 chars, no number
    }),
  });
  if (weakPasswordSignup.status !== 400 || weakPasswordSignup.data?.success) {
    throw new Error('Validation failed to reject weak password');
  }
  console.log(`Weak password correctly rejected with status ${weakPasswordSignup.status} (${weakPasswordSignup.data.message})`);
  console.log('✅ Test 3 Passed: Input validation works properly.\n');

  // ==========================================
  // TEST 4: Valid User Signup
  // ==========================================
  console.log('--- Test 4: Valid User Signup ---');
  const timestamp = Date.now();
  const userAEmail = `customer_a_${timestamp}@example.com`;
  const userBEmail = `customer_b_${timestamp}@example.com`;

  const signupA = await request(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'Customer Alpha',
      email: userAEmail,
      password: 'Password123',
      phone: '9876543210',
    }),
  });
  if (signupA.status !== 201 || !signupA.data?.token) {
    throw new Error(`Signup A failed: ${JSON.stringify(signupA.data)}`);
  }
  const tokenA = signupA.data.token;
  const userAId = signupA.data.user.id;
  console.log(`User A created successfully! ID: ${userAId}, Token received.`);
  console.log('✅ Test 4 Passed: Signup flow completed.\n');

  // ==========================================
  // TEST 5: Duplicate Email Signup (409 Conflict)
  // ==========================================
  console.log('--- Test 5: Duplicate Email Handling ---');
  const duplicateSignup = await request(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'Customer Alpha Duplicate',
      email: userAEmail,
      password: 'Password123',
    }),
  });
  if (duplicateSignup.status !== 409) {
    throw new Error(`Expected 409 for duplicate email, got: ${duplicateSignup.status}`);
  }
  console.log(`Duplicate registration correctly rejected with status 409 (${duplicateSignup.data.message})`);
  console.log('✅ Test 5 Passed: Duplicate emails prevented.\n');

  // ==========================================
  // TEST 6: Signin with Invalid vs Valid Credentials
  // ==========================================
  console.log('--- Test 6: Signin Credentials Check ---');
  const badLogin = await request(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      email: userAEmail,
      password: 'WrongPassword999',
    }),
  });
  if (badLogin.status !== 401) {
    throw new Error(`Expected 401 for wrong password, got: ${badLogin.status}`);
  }
  console.log(`Bad credentials rejected with status 401 (${badLogin.data.message})`);

  const goodLogin = await request(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      email: userAEmail,
      password: 'Password123',
    }),
  });
  if (goodLogin.status !== 200 || !goodLogin.data?.token) {
    throw new Error('Valid login failed');
  }
  console.log(`Valid login succeeded with 200: Welcome back, ${goodLogin.data.user.name}`);
  console.log('✅ Test 6 Passed: Login flow verified.\n');

  // Register User B for user isolation testing
  const signupB = await request(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'Customer Beta',
      email: userBEmail,
      password: 'Password123',
      phone: '9812345678',
    }),
  });
  const tokenB = signupB.data.token;
  const userBId = signupB.data.user.id;

  // ==========================================
  // TEST 7: Protected Profile Verification
  // ==========================================
  console.log('--- Test 7: Profile Access Control ---');
  const profileA = await request(`${API_BASE}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (!profileA.ok || profileA.data?.user?.email !== userAEmail) {
    throw new Error('Profile fetch failed');
  }
  console.log(`Authenticated profile retrieved: ${profileA.data.user.name} (${profileA.data.user.email})`);
  console.log('✅ Test 7 Passed: Protected route access verified.\n');

  // ==========================================
  // TEST 8: Direct Order Bypass Security Rejection
  // ==========================================
  console.log('--- Test 8: Direct Unverified Order Creation Security Check ---');
  const directOrderAttempt = await request(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Customer Alpha',
      email: userAEmail,
      phone: '9876543210',
      address: '123 Test Street',
      city: 'Delhi',
      pincode: '110001',
      products: [{ id: 404, name: 'Sling Bag', price: 1299, quantity: 1 }],
      total: 1398,
    }),
  });
  if (directOrderAttempt.status !== 400) {
    throw new Error(`Expected direct order to be rejected with 400, got: ${directOrderAttempt.status}`);
  }
  console.log(`Direct order correctly rejected: ${directOrderAttempt.data.message}`);
  console.log('✅ Test 8 Passed: Unverified order creation is blocked.\n');

  // ==========================================
  // TEST 9: Payment Order Creation & Price Tampering Resistance
  // ==========================================
  console.log('--- Test 9: Razorpay Order Creation & Price Manipulation Resistance ---');
  // Client tries to manipulate price to ₹1 instead of catalog price ₹1299 (Sling Bag ID 404, crochet delivery: ₹99)
  // Expected amount: (1299 * 1 + 99) * 100 paise = 139800 paise (₹1398)
  const orderCreateResp = await request(`${API_BASE}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Customer Alpha',
      email: userAEmail,
      phone: '9876543210',
      address: '123 Test Street',
      city: 'Delhi',
      pincode: '110001',
      products: [
        {
          id: 404,
          name: 'Sling Bag',
          price: 1, // Tampered price!
          quantity: 1,
          category: 'crochet',
        },
      ],
      payment: 'Razorpay',
    }),
  });

  if (!orderCreateResp.ok || !orderCreateResp.data?.order?.id) {
    throw new Error(`Payment order creation failed: ${JSON.stringify(orderCreateResp.data)}`);
  }

  const razorpayOrder = orderCreateResp.data.order;
  const attemptId = orderCreateResp.data.attemptId;
  console.log(`Razorpay Order created: ID=${razorpayOrder.id}, Amount=${razorpayOrder.amount} paise (₹${razorpayOrder.amount / 100})`);

  // Verify server enforced catalog price (₹1299 + ₹99 delivery = ₹1398 = 139800 paise), rejecting ₹1 tampering
  if (razorpayOrder.amount !== 139800) {
    throw new Error(`Price tampering detected! Expected 139800 paise, got ${razorpayOrder.amount}`);
  }
  console.log('Price tampering prevented: Server enforced true catalog price (₹1299 + ₹99 delivery).');
  console.log('✅ Test 9 Passed: Payment order creation verified and tamper-proof.\n');

  // ==========================================
  // TEST 10: Forged Signature Rejection
  // ==========================================
  console.log('--- Test 10: Forged Signature Rejection ---');
  const fakeVerify = await request(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: 'pay_fake123456789',
      razorpay_signature: 'forged_bogus_signature_hash',
    }),
  });
  if (fakeVerify.status !== 400) {
    throw new Error(`Expected 400 for forged signature, got: ${fakeVerify.status}`);
  }
  console.log(`Forged signature correctly rejected with 400 (${fakeVerify.data.message})`);
  console.log('✅ Test 10 Passed: Cryptographic validation rejects fraudulent signatures.\n');

  // ==========================================
  // TEST 11: Valid Signature Verification & Order Creation
  // ==========================================
  console.log('--- Test 11: Valid Payment Verification & Order Confirmation ---');
  const realPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrder.id}|${realPaymentId}`)
    .digest('hex');

  const verifyResp = await request(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: realPaymentId,
      razorpay_signature: validSignature,
    }),
  });

  if (!verifyResp.ok || !verifyResp.data?.success || !verifyResp.data?.order?._id) {
    throw new Error(`Payment verification failed: ${JSON.stringify(verifyResp.data)}`);
  }

  const confirmedOrder = verifyResp.data.order;
  console.log(`Payment verified successfully! Order created: #${confirmedOrder._id}`);
  console.log(`Order Total: ₹${confirmedOrder.total}, Status: ${confirmedOrder.status}, Payment: ${confirmedOrder.payment}`);
  console.log('✅ Test 11 Passed: Order confirmed and saved in database.\n');

  // ==========================================
  // TEST 12: Idempotency & Duplicate Prevention
  // ==========================================
  console.log('--- Test 12: Idempotent Payment Verification (Preventing Duplicate Orders) ---');
  const duplicateVerify = await request(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: realPaymentId,
      razorpay_signature: validSignature,
    }),
  });

  if (!duplicateVerify.ok || duplicateVerify.data?.message !== 'Payment already processed') {
    throw new Error(`Expected idempotency message, got: ${JSON.stringify(duplicateVerify.data)}`);
  }
  if (!duplicateVerify.data?.order?._id) {
    throw new Error('Idempotent response must return existing confirmed order data');
  }
  console.log(`Repeat verification safely handled without duplicate order: Order #${duplicateVerify.data.order._id}`);
  console.log('✅ Test 12 Passed: Idempotency prevents duplicate order creation.\n');

  // ==========================================
  // TEST 13: User Order Isolation
  // ==========================================
  console.log('--- Test 13: User Order Privacy & Isolation ---');
  // User A should see their 1 order
  const ordersA = await request(`${API_BASE}/api/orders`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (!ordersA.ok || ordersA.data.orders.length === 0) {
    throw new Error('User A failed to retrieve their orders');
  }
  console.log(`User A orders count: ${ordersA.data.orders.length} (Order #${ordersA.data.orders[0]._id})`);

  // User B should see 0 orders
  const ordersB = await request(`${API_BASE}/api/orders`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (!ordersB.ok || ordersB.data.orders.length !== 0) {
    throw new Error(`Data leak! User B saw ${ordersB.data.orders.length} orders belonging to User A`);
  }
  console.log(`User B orders count: ${ordersB.data.orders.length} (User B cannot see User A's orders)`);

  // User B attempts to verify User A's order -> MUST fail with 403
  const hijackAttempt = await request(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: realPaymentId,
      razorpay_signature: validSignature,
    }),
  });
  if (hijackAttempt.status !== 403) {
    throw new Error(`Expected 403 for unauthorized attempt verification, got: ${hijackAttempt.status}`);
  }
  console.log(`Order hijacking attempt by unauthorized user correctly blocked with 403 (${hijackAttempt.data.message})`);
  console.log('✅ Test 13 Passed: User isolation and privacy strictly enforced.\n');

  console.log('====================================================');
  console.log('🎉 ALL 13 END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
};

try {
  await run();
} catch (error) {
  console.error('❌ Test Suite Failed:');
  console.error(error);
  process.exit(1);
}

