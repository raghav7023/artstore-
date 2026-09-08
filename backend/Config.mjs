// ==========================================
// Config.mjs - Environment variables load karo
// ==========================================
// Purpose: .env file se saari values read karke export karo
// Isse hum server ke kisi bhi file mein import kar sakte hain

import dotenv from 'dotenv';

// dotenv.config() .env file ko read karta hai aur
// process.env mein saari values set karta hai
dotenv.config();

// Ab .env se values nikalo aur export karo
const MONGODB_URL = process.env.MONGODB_URL;
const PORT = process.env.PORT || 2026;
const JWT_SECRET = (process.env.JWT_SECRET || '').trim();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d').trim();
const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TO_NUMBER = process.env.WHATSAPP_TO_NUMBER;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';

// ── Email config ──────────────────────────────────────────────
// EMAIL_USER     : Gmail address that sends the emails
// EMAIL_PASSWORD : Gmail App Password (kept secret, never logged)
// ORDER_NOTIFICATION_EMAIL : where store-owner alerts are sent
//   Falls back to EMAIL_USER if not separately configured.
const EMAIL_USER = (process.env.EMAIL_USER || '').trim();
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || '').trim();
const ORDER_NOTIFICATION_EMAIL = (process.env.ORDER_NOTIFICATION_EMAIL || EMAIL_USER).trim();

// Check karo ki important values exist karti hain ya nahi
if (!MONGODB_URL) {
  console.error('❌ ERROR: MONGODB_URL .env file mein nahi milaa!');
 
  process.exit(1); // Server band kar do agar DB URL nahi hai
}

if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET .env file mein nahi milaa!');
  process.exit(1);
}

// Email config missing hone par sirf warn karo — server band nahi hoga
if (!EMAIL_USER || !EMAIL_PASSWORD) {
  console.warn('⚠️  EMAIL_USER / EMAIL_PASSWORD not set. Order emails will be skipped.');
}

export { MONGODB_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN };
export { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO_NUMBER, WHATSAPP_API_VERSION };
export { EMAIL_USER, EMAIL_PASSWORD, ORDER_NOTIFICATION_EMAIL };