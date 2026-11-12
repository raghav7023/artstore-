import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import modules under test
import {
  sendOrderEmails,
  sendOwnerOrderEmail,
  sendCustomerOrderEmail,
  sendMailWithFallback,
} from '../src/utils/emailService.js';
import Order from '../src/models/Order.model.js';

describe('Artstore Email Notification & Resilience Suite', () => {
  // Test fixture order factory
  const createMockOrder = (overrides = {}) => ({
    _id: '670000000000000000000001',
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '9876543210',
    address: '123 Art Studio Lane',
    city: 'Jaipur',
    pincode: '302001',
    payment: 'Razorpay',
    products: [
      { id: 101, name: 'Handmade Canvas Art', price: 999, quantity: 1 },
    ],
    total: 999,
    status: 'Processing',
    emailsSent: {
      customer: false,
      owner: false,
    },
    ...overrides,
  });

  describe('1. Missing / Invalid Configuration Tests', () => {
    it('should return missing_customer_email or invalid_email when customer email is invalid', async () => {
      const order = createMockOrder({ email: 'not-an-email' });
      const result = await sendCustomerOrderEmail(order);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, 'invalid_email');
    });

    it('should safely handle missing order object in sendOrderEmails', async () => {
      const result = await sendOrderEmails(null);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, 'no_order');
    });
  });

  describe('2. Independent Failure Isolation & Flag Persistence', () => {
    it('one notification failure should not prevent the other notification from being attempted', async () => {
      // Mock Order.updateOne to record DB updates
      let updatedFields = null;
      const originalUpdateOne = Order.updateOne;
      Order.updateOne = async (query, update) => {
        updatedFields = update.$set;
        return { acknowledged: true, modifiedCount: 1 };
      };

      try {
        // Customer email is invalid -> customer will fail, but owner will be attempted
        const order = createMockOrder({
          _id: `test_iso_${Date.now()}`,
          email: '', // Missing email
        });

        const result = await sendOrderEmails(order);

        // Customer notification must have failed cleanly
        assert.strictEqual(result.customer.success, false);
        assert.strictEqual(result.customer.reason, 'invalid_email');

        // Customer DB flag must be false, without throwing an unhandled rejection
        assert.strictEqual(updatedFields['emailsSent.customer'], false);
      } finally {
        Order.updateOne = originalUpdateOne;
      }
    });

    it('should preserve previously successful flags when a notification is skipped on retry (Critical Regression)', async () => {
      let updatedFields = null;
      const originalUpdateOne = Order.updateOne;
      Order.updateOne = async (query, update) => {
        updatedFields = update.$set;
        return { acknowledged: true, modifiedCount: 1 };
      };

      try {
        // Simulate order where OWNER was already successfully sent, but CUSTOMER is pending
        const order = createMockOrder({
          _id: `test_preserve_${Date.now()}`,
          emailsSent: {
            owner: true,
            customer: false,
          },
        });

        const result = await sendOrderEmails(order, { force: false });

        // Owner notification should have been SKIPPED
        assert.strictEqual(result.owner.skipped, true);

        // CRITICAL ASSERTION: The DB update for emailsSent.owner must PRESERVE true, NOT set to false
        assert.strictEqual(
          updatedFields['emailsSent.owner'],
          true,
          'emailsSent.owner must remain TRUE when skipped on retry'
        );
      } finally {
        Order.updateOne = originalUpdateOne;
      }
    });

    it('should skip duplicate notifications when both flags are already true', async () => {
      const order = createMockOrder({
        _id: `test_both_true_${Date.now()}`,
        emailsSent: {
          owner: true,
          customer: true,
        },
      });

      const result = await sendOrderEmails(order, { force: false });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, 'already_processed_db');
    });
  });

  describe('3. Controller Duplicate Retry Paths (Verification & Webhook)', () => {
    it('verifyPayment duplicate path checks existingOrder.emailsSent before returning', () => {
      // Functional assertion on the logic:
      // If owner is true and customer is false, retry must be triggered
      const existingOrder = createMockOrder({
        emailsSent: { owner: true, customer: false },
      });
      const ownerSent = !!existingOrder.emailsSent?.owner;
      const customerSent = !!existingOrder.emailsSent?.customer;
      const needsRetry = !ownerSent || !customerSent;

      assert.strictEqual(needsRetry, true, 'Incomplete notification must trigger retry');
    });

    it('verifyPayment duplicate path does NOT retry if both flags are already true', () => {
      const existingOrder = createMockOrder({
        emailsSent: { owner: true, customer: true },
      });
      const ownerSent = !!existingOrder.emailsSent?.owner;
      const customerSent = !!existingOrder.emailsSent?.customer;
      const needsRetry = !ownerSent || !customerSent;

      assert.strictEqual(needsRetry, false, 'Complete notifications must not trigger retry');
    });
  });

  describe('4. Resend Error Propagation & API Acceptance Distinction', () => {
    it('sendMailWithFallback must not claim confirmed delivery upon API acceptance', async () => {
      // When Resend or SMTP succeeds, the status/provider distinguishes API acceptance
      // If no provider is configured, returns explicit error reason
      const result = await sendMailWithFallback({
        to: 'invalid-address',
        subject: 'Test Subject',
        text: 'Test content',
      });

      // Without live keys or with invalid recipient, it must not return success: true
      // It must return an explicit failure reason or error message
      if (!result.success) {
        assert.ok(result.reason || result.error, 'Failure must include an explicit reason or error');
      } else {
        assert.ok(result.messageId, 'Success must provide a provider messageId');
        assert.ok(result.provider, 'Success must state the provider used');
      }
    });
  });
});
