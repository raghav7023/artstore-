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
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Check karo ki important values exist karti hain ya nahi
if (!MONGODB_URL) {
  console.error('❌ ERROR: MONGODB_URL .env file mein nahi milaa!');
  process.exit(1); // Server band kar do agar DB URL nahi hai
}

if (!JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET .env file mein nahi milaa!');
  process.exit(1);
}

export { MONGODB_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN };