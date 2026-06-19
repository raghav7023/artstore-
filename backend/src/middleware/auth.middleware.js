// ==========================================
// auth.middleware.js - JWT Token Verify Karo
// ==========================================
// Purpose: Ye middleware check karta hai ki request bhejne wala
//          user logged in hai ya nahi
// Middleware = Request aur Response ke beech ka "Guard"
// Jaise: Ek security guard jo check karta hai ticket hai ya nahi

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../Config.mjs';

// ==========================================
// PROTECT MIDDLEWARE
// ==========================================
// Ye function protected routes ke aage lagta hai
// Agar valid token hai → Request aage jaane do
// Agar token nahi / invalid hai → 401 error return karo
export const protect = async (req, res, next) => {
  try {
    // Step 1: Token dhundo request headers mein
    // Token is format mein aata hai: "Bearer eyJhbGciOiJIUzI1..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Token nahi mila
      return res.status(401).json({
        success: false,
        message: 'Please sign in to access this page.',
      });
    }

    // "Bearer " hata ke sirf token nikalo
    // "Bearer eyJhbGci..." → "eyJhbGci..."
    const token = authHeader.split(' ')[1];

    // Step 2: Token verify karo
    // jwt.verify checks: 1) Token valid hai? 2) Expire toh nahi hua?
    const decoded = jwt.verify(token, JWT_SECRET);
    // Agar token invalid/expired hai toh verify throw karega error
    // Jo catch block mein catch hoga

    // Step 3: Decoded info ko req.user mein save karo
    // Ye info agle middleware/controller ko milegi
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    // Step 4: Next middleware/controller ko call karo
    next();
  } catch (error) {
    // Token invalid ya expire ho gaya
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please sign in again.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

// ==========================================
// ADMIN MIDDLEWARE
// ==========================================
// Ye sirf admin users ko access deta hai
// Pehle protect middleware chalega, phir ye
export const adminOnly = (req, res, next) => {
  // req.user protect middleware ne set kiya hoga
  if (req.user && req.user.role === 'admin') {
    next(); // Admin hai, aage jaane do
  } else {
    res.status(403).json({
      // 403 = Forbidden (access nahi hai)
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
};
