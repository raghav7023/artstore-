import { setTimeout as wait } from 'timers/promises';

const API_BASE = 'http://localhost:2026';

const jsonHeaders = { 'Content-Type': 'application/json' };

const sleep = async (ms) => wait(ms);

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
  console.log('🔎 Starting backend smoke test...');

  const health = await request(`${API_BASE}/`);
  console.log('Health check:', health.status, health.data?.message || health.data?.raw || 'OK');

  if (!health.ok) {
    throw new Error('Backend is not responding on localhost:2026');
  }

  const unique = Date.now();
  const email = `smoketest${unique}@example.com`;

  const signup = await request(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: 'Smoke Test User',
      email,
      password: 'Abcdef1',
      phone: '9876543210',
    }),
  });

  console.log('Signup:', signup.status, signup.data?.success ? 'SUCCESS' : signup.data?.message || 'FAIL');
  if (!signup.ok || !signup.data.success) {
    throw new Error(`Signup failed: ${JSON.stringify(signup.data)}`);
  }

  const token = signup.data.token;
  const profile = await request(`${API_BASE}/api/auth/profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Profile:', profile.status, profile.data?.success ? 'SUCCESS' : profile.data?.message || 'FAIL');
  if (!profile.ok || !profile.data.success) {
    throw new Error(`Profile verification failed: ${JSON.stringify(profile.data)}`);
  }

  const customOrder = await request(`${API_BASE}/api/custom-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Smoke Test User',
      email,
      phone: '9876543210',
      product: 'Keychain',
      color: 'Pink',
      budget: 499,
      delivery: '2026-09-01',
      message: 'Smoke test custom request',
      image: '',
    }),
  });

  console.log('Custom Order:', customOrder.status, customOrder.data?.success ? 'SUCCESS' : customOrder.data?.message || 'FAIL');
  if (!customOrder.ok || !customOrder.data.success) {
    throw new Error(`Custom order failed: ${JSON.stringify(customOrder.data)}`);
  }

  const normalOrder = await request(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Smoke Test User',
      email,
      phone: '9876543210',
      address: '12 Smoke Street',
      city: 'Delhi',
      pincode: '110001',
      payment: 'Cash on Delivery',
      products: [{ id: 1, name: 'Test Product', price: 299, quantity: 2, image: '/test.jpg' }],
      total: 598,
    }),
  });

  console.log('Normal Order:', normalOrder.status, normalOrder.data?.success ? 'SUCCESS' : normalOrder.data?.message || 'FAIL');
  if (!normalOrder.ok || !normalOrder.data.success) {
    throw new Error(`Normal order failed: ${JSON.stringify(normalOrder.data)}`);
  }

  const orderList = await request(`${API_BASE}/api/orders`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Order List:', orderList.status, orderList.data?.success ? 'SUCCESS' : orderList.data?.message || 'FAIL');
  if (!orderList.ok || !orderList.data.success) {
    throw new Error(`Order list failed: ${JSON.stringify(orderList.data)}`);
  }

  const customList = await request(`${API_BASE}/api/custom-orders`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log('Custom Order List:', customList.status, customList.data?.success ? 'SUCCESS' : customList.data?.message || 'FAIL');
  if (!customList.ok || !customList.data.success) {
    throw new Error(`Custom order list failed: ${JSON.stringify(customList.data)}`);
  }

  console.log('✅ Smoke test passed');
};

try {
  await run();
} catch (error) {
  console.error('❌ Smoke test failed');
  console.error(error.message);
  process.exit(1);
}
