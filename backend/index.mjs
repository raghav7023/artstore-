// ==========================================
// index.mjs - Main Server File (Entry Point)
// ==========================================
// Purpose: Ye hamara main server file hai
// Ye sab kuch ek jagah connect karta hai:
// Express → Middleware → Routes → MongoDB → Listen

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { MONGODB_URL, PORT } from './Config.mjs';
import path from 'path';
import fs from 'fs';

// Routes import karo
import authRoutes from './src/routes/auth.routes.js';
import orderRoutes from "./src/routes/order.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";

// ==========================================
// Express App Banao
// ==========================================
const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 1. CORS Configuration
// CORS = Cross-Origin Resource Sharing
// Iska matlab: Kaun se domains hamara API use kar sakte hain
// React frontend different port pe run karta hai (5173)
// Isliye hume explicitly allow karna padega
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://artstore-by-raghav.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// 2. Rate Limiting
// Ye prevent karta hai: Brute force attacks (password guessing)
// 15 minute mein maximum 100 requests allowed hain ek IP se
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // Maximum 100 requests
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes pe zyada strict rate limiting
// 15 minute mein sirf 20 login/signup attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// General rate limiter sab routes pe lagao
app.use(limiter);

// ==========================================
// BODY PARSING MIDDLEWARE
// ==========================================
// Ye allow karta hai ki hum req.body se data read kar sakein
// JSON format mein data aayega frontend se
app.use(express.json({ limit: '10kb' })); // 10kb se zyada body reject karo
app.use(express.urlencoded({ extended: true })); // Form data bhi handle karo

// ==========================================
// TEST ROUTE
// ==========================================
// Ye route check karne ke liye hai ki server chal raha hai
app.get('/', (req, res) => {
  // If frontend build exists, serve the SPA index.html for root
  try {
    if (fs.existsSync(clientDist)) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
  } catch (e) {
    // ignore and fall back to JSON
  }

  res.json({
    success: true,
    message: '🎨 Art Store API is running!',
    version: '1.0.0',
  });
});

// ==========================================
// ROUTES CONNECT KARO
// ==========================================
// Sab auth routes /api/auth se start honge
// Jaise: /api/auth/signup, /api/auth/signin
app.use('/api/auth', authLimiter, authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

// ==========================================
// Serve frontend static files when built (local production test)
// ==========================================
const __dirname = path.resolve();
const clientDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // For SPA routes, serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}


// ==========================================
// 404 Handler - Unknown Routes
// ==========================================
// Agar koi route match nahi hua toh ye chalega
// Express 4 mein '*' use karte hain
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
// Agar koi bhi error aaye toh ye catch karega
// Express mein 4 parameters wala function = Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong on the server.',
    // Development mein details dikhao, Production mein nahi
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// ==========================================
// DATABASE + SERVER START KARO
// ==========================================
const startServer = async () => {
  try {
    // Pehle MongoDB se connect karo
    // console.log("MONGODB_URL =", MONGODB_URL);
    console.log("Type =", typeof MONGODB_URL);  
    await mongoose.connect(MONGODB_URL);
    console.log("Connected Database:", mongoose.connection.name);
    console.log('✅ MongoDB se connection ho gaya!');

    // Phir server start karo
    app.listen(PORT, () => {
      console.log(`✅ Server chal raha hai: http://localhost:${PORT}`);
      console.log(`📋 API Docs: http://localhost:${PORT}/api/auth/signup`);
    });
  } catch (error) {
    console.error('❌ Server start karne mein error:', error.message);
    process.exit(1); // Server band kar do
  }
};

// Server start karo!
startServer();