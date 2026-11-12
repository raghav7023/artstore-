import crypto from 'crypto';
import EmailLog from '../models/EmailLog.model.js';

// POST /api/webhooks/resend
export const handleResendWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature if RESEND_WEBHOOK_SECRET is configured
    if (webhookSecret) {
      const svixId = req.headers['svix-id'];
      const svixTimestamp = req.headers['svix-timestamp'];
      const svixSignature = req.headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ success: false, message: 'Missing Svix webhook headers' });
      }

      // Check timestamp freshness (within 5 minutes to prevent replay attacks)
      const timestampSeconds = parseInt(svixTimestamp, 10);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSeconds - timestampSeconds) > 300) {
        return res.status(400).json({ success: false, message: 'Expired webhook timestamp' });
      }

      // Signed content is "${svixId}.${svixTimestamp}.${body}"
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

      // Secret can be prefixed with "whsec_"
      const secretBytes = webhookSecret.startsWith('whsec_')
        ? Buffer.from(webhookSecret.slice(6), 'base64')
        : Buffer.from(webhookSecret, 'utf8');

      const computedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');

      const expectedSignatureHeader = `v1,${computedSignature}`;
      const signatures = svixSignature.split(' ');
      const isMatched = signatures.some((sig) => {
        try {
          const sigBuf = Buffer.from(sig, 'utf8');
          const expBuf = Buffer.from(expectedSignatureHeader, 'utf8');
          return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
        } catch {
          return false;
        }
      });

      if (!isMatched) {
        console.warn('⚠️ [Resend Webhook] Signature verification failed');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const { type, data } = req.body || {};
    const emailId = data?.email_id;

    if (!emailId) {
      return res.status(200).json({ success: true, message: 'No email_id in event payload' });
    }

    console.log(`ℹ️ [Resend Webhook] Processing event: ${type} for email_id: ${emailId}`);

    // Find the corresponding EmailLog
    const emailLog = await EmailLog.findOne({ providerMessageId: emailId });
    if (!emailLog) {
      console.log(`ℹ️ [Resend Webhook] No matching EmailLog found for providerMessageId: ${emailId}`);
      return res.status(200).json({ success: true, message: 'Event acknowledged; no matching local record' });
    }

    // Idempotent state transitions based on Resend webhook event type
    const updates = {};
    const metadata = emailLog.metadata || {};

    switch (type) {
      case 'email.delivered':
        updates.status = 'delivered';
        updates.errorMessage = '';
        metadata.deliveredAt = new Date();
        break;

      case 'email.bounced':
        updates.status = 'bounced';
        updates.errorMessage = data.bounce?.message || 'Email bounced by recipient mail server';
        metadata.bouncedAt = new Date();
        metadata.bounceDetails = data.bounce || {};
        break;

      case 'email.complained':
        updates.status = 'complained';
        updates.errorMessage = 'Recipient registered a spam complaint';
        metadata.complainedAt = new Date();
        break;

      case 'email.sent':
        if (emailLog.status === 'pending') {
          updates.status = 'sent';
        }
        break;

      default:
        metadata[`event_${type.replace(/\./g, '_')}`] = new Date();
        break;
    }

    updates.metadata = metadata;
    await EmailLog.updateOne({ _id: emailLog._id }, { $set: updates });

    console.log(`✅ [Resend Webhook] Updated EmailLog #${emailLog._id} -> status: ${updates.status || emailLog.status}`);
    return res.status(200).json({ success: true, message: 'Webhook event processed successfully' });
  } catch (error) {
    console.error('❌ [Resend Webhook Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Webhook processing failed' });
  }
};
