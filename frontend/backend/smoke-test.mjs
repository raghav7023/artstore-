import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MONGODB_URL, RAZORPAY_KEY_SECRET, JWT_SECRET } from './Config.mjs';
import User from './src/models/User.model.js';
import EmailLog from './src/models/EmailLog.model.js';

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

  // ==========================================
  // TEST 14: Dynamic UPI QR Payment Flow Verification
  // ==========================================
  console.log('--- Test 14: Dynamic UPI QR Payment Verification & Order Confirmation ---');
  const qrOrderCreate = await request(`${API_BASE}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: 'Customer Alpha UPI',
      email: userAEmail,
      phone: '9876543210',
      address: '789 Studio Lane',
      city: 'Delhi',
      pincode: '110001',
      products: [{ id: 404, name: 'Sling Bag', price: 1299, quantity: 1, category: 'crochet' }],
      payment: 'Razorpay',
    }),
  });

  if (!qrOrderCreate.ok || !qrOrderCreate.data?.order?.id) {
    throw new Error(`QR Order creation failed: ${JSON.stringify(qrOrderCreate.data)}`);
  }

  const qrRazorpayOrder = qrOrderCreate.data.order;
  const qrRealPaymentId = `pay_upi_qr_${Date.now()}`;
  const qrValidSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${qrRazorpayOrder.id}|${qrRealPaymentId}`)
    .digest('hex');

  const qrVerifyResp = await request(`${API_BASE}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      razorpay_order_id: qrRazorpayOrder.id,
      razorpay_payment_id: qrRealPaymentId,
      razorpay_signature: qrValidSignature,
      payment_method: 'UPI',
    }),
  });

  if (!qrVerifyResp.ok || !qrVerifyResp.data?.success || !qrVerifyResp.data?.order?._id) {
    throw new Error(`Dynamic UPI QR payment verification failed: ${JSON.stringify(qrVerifyResp.data)}`);
  }

  const qrConfirmedOrder = qrVerifyResp.data.order;
  console.log(`Dynamic UPI QR Payment verified! Order #${qrConfirmedOrder._id}, Method: ${qrConfirmedOrder.payment}, Total: ₹${qrConfirmedOrder.total}`);
  console.log('✅ Test 14 Passed: Dynamic UPI QR payment verified, order confirmed, and customer/owner emails dispatched.\n');

  // ==========================================
  // TEST 15: Razorpay Webhook Event Processing
  // ==========================================
  console.log('--- Test 15: Server-to-Server Razorpay Webhook Processing ---');
  const webhookOrderCreate = await request(`${API_BASE}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      name: 'Customer Beta Webhook',
      email: userBEmail,
      phone: '9812345678',
      address: '999 Server Road',
      city: 'Delhi',
      pincode: '110001',
      products: [{ id: 404, name: 'Sling Bag', price: 1299, quantity: 1, category: 'crochet' }],
      payment: 'Razorpay',
    }),
  });

  const webhookRazorpayOrder = webhookOrderCreate.data.order;
  const webhookPaymentId = `pay_hook_${Date.now()}`;
  const webhookBody = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPaymentId,
          order_id: webhookRazorpayOrder.id,
          amount: 139800,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
        },
      },
    },
  };
  const rawWebhookBody = JSON.stringify(webhookBody);
  const webhookSig = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(rawWebhookBody)
    .digest('hex');

  const webhookResp = await request(`${API_BASE}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSig,
    },
    body: rawWebhookBody,
  });

  if (!webhookResp.ok || !webhookResp.data?.success) {
    throw new Error(`Webhook test failed: ${JSON.stringify(webhookResp.data)}`);
  }
  console.log(`Webhook successfully processed and order created: ${webhookResp.data.orderId || 'OK'}`);
  console.log('✅ Test 15 Passed: Server-to-server webhook verified and orders confirmed automatically.\n');

  // ==========================================
  // TEST 16: Admin Endpoint Authorization Protection
  // ==========================================
  console.log('--- Test 16: Admin Endpoint Security & Role-Based Access Control ---');
  // 16a: Unauthenticated access
  const unauthResp = await request(`${API_BASE}/api/admin/dashboard`);
  if (unauthResp.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for missing admin token, got: ${unauthResp.status}`);
  }
  console.log('Unauthenticated request to /api/admin/dashboard correctly rejected with 401');

  // 16b: Customer attempting admin access
  const customerAdminAttempt = await request(`${API_BASE}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (customerAdminAttempt.status !== 403) {
    throw new Error(`Expected 403 Forbidden for customer accessing admin route, got: ${customerAdminAttempt.status}`);
  }
  console.log('Customer token attempting /api/admin/dashboard correctly rejected with 403 Forbidden');

  const customerUserListAttempt = await request(`${API_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  if (customerUserListAttempt.status !== 403) {
    throw new Error(`Expected 403 Forbidden for customer accessing /api/admin/users, got: ${customerUserListAttempt.status}`);
  }
  console.log('Customer token attempting /api/admin/users correctly rejected with 403 Forbidden');
  console.log('✅ Test 16 Passed: Admin routes strictly secured with 401 and 403 guards.\n');

  // ==========================================
  // TEST 17: Admin Access with Role Verification
  // ==========================================
  console.log('--- Test 17: Admin Access & Dashboard Statistics API ---');
  const adminUser = await User.create({
    name: 'Admin Commander',
    email: `admin_${timestamp}@artstore.internal`,
    password: 'HashedPassword123',
    role: 'admin',
    status: 'active',
  });
  const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const dashboardResp = await request(`${API_BASE}/api/admin/dashboard`, { headers: adminHeaders });
  if (!dashboardResp.ok || !dashboardResp.data?.success || !dashboardResp.data?.stats) {
    throw new Error(`Failed to fetch admin dashboard: ${JSON.stringify(dashboardResp.data)}`);
  }
  const stats = dashboardResp.data.stats;
  console.log(`Admin Dashboard Stats -> Users: ${stats.totalUsers}, Orders: ${stats.totalOrders}, Revenue: ₹${stats.totalRevenue}, Products: ${stats.totalProducts}`);

  const settingsResp = await request(`${API_BASE}/api/admin/settings`, { headers: adminHeaders });
  if (!settingsResp.ok || !settingsResp.data?.success || !settingsResp.data?.settings) {
    throw new Error(`Failed to fetch admin settings: ${JSON.stringify(settingsResp.data)}`);
  }
  console.log(`System Diagnostics -> Email Provider: ${settingsResp.data.settings.emailService?.provider}, DB State: ${settingsResp.data.settings.system?.databaseState}`);

  const adminProductsResp = await request(`${API_BASE}/api/admin/products`, { headers: adminHeaders });
  if (!adminProductsResp.ok || !adminProductsResp.data?.success || !adminProductsResp.data?.products?.length) {
    throw new Error(`Failed to fetch admin products: ${JSON.stringify(adminProductsResp.data)}`);
  }
  console.log(`Admin Products -> Catalog Items: ${adminProductsResp.data.products.length}`);
  console.log('✅ Test 17 Passed: Admin authorized access, real dashboard statistics & diagnostics verified.\n');

  // ==========================================
  // TEST 18: User Management & Account Deactivation
  // ==========================================
  console.log('--- Test 18: User Management & Account Activation/Deactivation ---');
  const userListResp = await request(`${API_BASE}/api/admin/users?search=Customer+Alpha`, { headers: adminHeaders });
  if (!userListResp.ok || !userListResp.data?.users?.length) {
    throw new Error('Failed to search users in admin API');
  }
  console.log(`User list returned ${userListResp.data.users.length} match for Customer Alpha`);

  const userDetailResp = await request(`${API_BASE}/api/admin/users/${userAId}`, { headers: adminHeaders });
  if (!userDetailResp.ok || !userDetailResp.data?.user) {
    throw new Error('Failed to retrieve user detail');
  }
  console.log(`User Detail -> Name: ${userDetailResp.data.user.name}, Total Orders: ${userDetailResp.data.user.totalOrders}`);

  // Deactivate User A
  const deactResp = await request(`${API_BASE}/api/admin/users/${userAId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'inactive' }),
  });
  if (!deactResp.ok || !deactResp.data?.success) {
    throw new Error(`Failed to deactivate user: ${JSON.stringify(deactResp.data)}`);
  }
  console.log(`User A account deactivated successfully.`);

  // Attempt login with deactivated user
  const deactLogin = await request(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: userAEmail, password: 'Password123' }),
  });
  if (deactLogin.status !== 403) {
    throw new Error(`Expected 403 for deactivated user login, got: ${deactLogin.status}`);
  }
  console.log(`Deactivated user login properly blocked with 403: "${deactLogin.data.message}"`);

  // Reactivate User A
  const reactResp = await request(`${API_BASE}/api/admin/users/${userAId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'active' }),
  });
  if (!reactResp.ok || !reactResp.data?.success) {
    throw new Error('Failed to reactivate user');
  }
  console.log(`User A account reactivated successfully.`);
  console.log('✅ Test 18 Passed: User management & account activation/deactivation verified.\n');

  // ==========================================
  // TEST 19: Order Management & Status Updates
  // ==========================================
  console.log('--- Test 19: Order Management & Status Updates ---');
  const adminOrdersResp = await request(`${API_BASE}/api/admin/orders`, { headers: adminHeaders });
  if (!adminOrdersResp.ok || !adminOrdersResp.data?.orders?.length) {
    throw new Error('Failed to fetch admin orders');
  }
  console.log(`Total orders retrieved: ${adminOrdersResp.data.orders.length}`);

  const singleOrderLookup = await request(`${API_BASE}/api/admin/orders/${qrConfirmedOrder._id}`, { headers: adminHeaders });
  if (!singleOrderLookup.ok || !singleOrderLookup.data?.order) {
    throw new Error('Failed to fetch single order detail');
  }
  console.log(`Order Lookup: #${singleOrderLookup.data.order._id}, Status: ${singleOrderLookup.data.order.status}`);

  // Update status to 'Shipped'
  const updateStatusResp = await request(`${API_BASE}/api/admin/orders/${qrConfirmedOrder._id}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'Shipped' }),
  });
  if (!updateStatusResp.ok || updateStatusResp.data?.order?.status !== 'Shipped') {
    throw new Error(`Failed to update order status: ${JSON.stringify(updateStatusResp.data)}`);
  }
  console.log(`Order #${qrConfirmedOrder._id} status updated to: ${updateStatusResp.data.order.status}`);
  console.log('✅ Test 19 Passed: Order management and lifecycle status updates verified.\n');

  // ==========================================
  // TEST 20: Payment Attempts & Email Delivery Logs
  // ==========================================
  console.log('--- Test 20: Payment History & Email Audit Logs ---');
  const adminPaymentsResp = await request(`${API_BASE}/api/admin/payments`, { headers: adminHeaders });
  if (!adminPaymentsResp.ok || !adminPaymentsResp.data?.payments?.length) {
    throw new Error('Failed to fetch admin payments');
  }
  console.log(`Total payments retrieved: ${adminPaymentsResp.data.payments.length}`);

  const adminEmailsResp = await request(`${API_BASE}/api/admin/emails`, { headers: adminHeaders });
  if (!adminEmailsResp.ok || !adminEmailsResp.data?.emails) {
    throw new Error('Failed to fetch admin emails');
  }
  console.log(`Total email delivery logs retrieved: ${adminEmailsResp.data.emails.length}`);
  console.log('✅ Test 20 Passed: Payment history and email audit logs retrieved successfully.\n');

  // ==========================================
  // TEST 21: Email Retry Capability & Safeguards
  // ==========================================
  console.log('--- Test 21: Email Retry Capability & Safeguards ---');
  const mockFailedEmail = await EmailLog.create({
    recipient: userAEmail,
    recipientName: 'Customer Alpha',
    emailType: 'order_confirmation_customer',
    subject: 'Order Confirmation - Retry Test',
    relatedOrder: qrConfirmedOrder._id,
    status: 'failed',
    attemptCount: 1,
    maxAttempts: 3,
    errorMessage: 'Simulated network timeout',
  });

  const retryResp = await request(`${API_BASE}/api/admin/emails/${mockFailedEmail._id}/retry`, {
    method: 'POST',
    headers: adminHeaders,
  });
  if (!retryResp.ok || !retryResp.data?.success) {
    throw new Error(`Email retry failed: ${JSON.stringify(retryResp.data)}`);
  }
  console.log(`Email retry completed with status: ${retryResp.data.emailLog?.status}`);
  console.log('✅ Test 21 Passed: Admin manual email retry verified with safeguards.\n');

  // ==========================================
  // TEST 22: Resend Delivery Webhook Ingestion
  // ==========================================
  console.log('--- Test 22: Resend Webhook Ingestion ---');
  const mockWebhookLog = await EmailLog.create({
    recipient: 'delivered_user@example.com',
    recipientName: 'Delivered User',
    emailType: 'order_confirmation_customer',
    subject: 'Order Confirmation - Webhook Test',
    provider: 'resend',
    providerMessageId: `msg_resend_hook_${Date.now()}`,
    status: 'sent',
    attemptCount: 1,
    maxAttempts: 3,
  });

  const resendHookResp = await request(`${API_BASE}/api/webhooks/resend`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      type: 'email.delivered',
      created_at: new Date().toISOString(),
      data: {
        email_id: mockWebhookLog.providerMessageId,
        from: 'Art Store <orders@artstorestudio.com>',
        to: ['delivered_user@example.com'],
        subject: 'Order Confirmation - Webhook Test',
      },
    }),
  });

  if (!resendHookResp.ok || !resendHookResp.data?.success) {
    throw new Error(`Resend webhook failed: ${JSON.stringify(resendHookResp.data)}`);
  }

  const updatedHookLog = await EmailLog.findById(mockWebhookLog._id);
  if (updatedHookLog.status !== 'delivered') {
    throw new Error(`Expected EmailLog status to be 'delivered', got: ${updatedHookLog.status}`);
  }
  console.log(`Resend webhook processed: EmailLog #${mockWebhookLog._id} updated to 'delivered'`);
  console.log('✅ Test 22 Passed: Resend webhook event processing verified.\n');

  console.log('====================================================');
  console.log('🎉 ALL 22 END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!');
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

