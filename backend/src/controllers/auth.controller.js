// ==========================================
// auth.controller.js - Signup & Signin Logic
// ==========================================
// Purpose: Ye file actual authentication logic handle karti hai
// Controller = Jo actual kaam karta hai (data process karna)

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.model.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../Config.mjs';

// ==========================================
// Helper Function: JWT Token banao
// ==========================================
// JWT = JSON Web Token - ek encrypted string jo user ki identity prove karti hai
// Jaise passport - isko dekh ke server samajhta hai ki user logged in hai
const createToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role: role }, // Token mein kya info store karni hai
    JWT_SECRET,                  // Secret key se encrypt karo
    { expiresIn: JWT_EXPIRES_IN } // 7 din baad expire ho jaayega
  );
};

// ==========================================
// SIGNUP CONTROLLER
// ==========================================
// Route: POST /api/auth/signup
// Kaam: Naya user register karo
export const signup = async (req, res) => {
  try {
    // Step 1: Validation errors check karo
    // express-validator ne jo validation lagayi hai route mein, uske errors check karo
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(), // Saari errors ki list bhejo
      });
    }

    // Step 2: Request body se data nikalo
    const { name, email, password, phone } = req.body;

    // Step 3: Check karo kya same email se account already hai
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(409).json({
        // 409 = Conflict (already exists)
        success: false,
        message: 'Email already registered. Please sign in instead.',
      });
    }

    // Step 4: Password hash karo (MOST IMPORTANT SECURITY STEP!)
    // bcrypt.hash(password, saltRounds)
    // saltRounds = 12 matlab 2^12 = 4096 times hash hoga - very secure
    // KABHI BHI plain password save mat karo!
    const hashedPassword = await bcrypt.hash(password, 12);

    // Step 5: Naya user banao database mein
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword, // Hashed password save karo, NEVER plain
      phone: phone || '',
      role: 'user', // Default role
    });
    console.log("✅ User Saved:", newUser);   

    // Step 6: JWT Token banao
    const token = createToken(newUser._id, newUser.role);

    // Step 7: Response bhejo (password ke bina!)
    res.status(201).json({
      // 201 = Created successfully
      success: true,
      message: 'Account created successfully! Welcome to Art Store 🎨',
      token, // Token frontend ko dedo
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        // NOTE: Password kabhi response mein mat bhejo!
      },
    });
  } catch (error) {
    // Agar koi unexpected error aaye
    console.error('Signup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      // NOTE: Production mein actual error message mat bhejo - security risk!
    });
  }
};

// ==========================================
// SIGNIN CONTROLLER
// ==========================================
// Route: POST /api/auth/signin
// Kaam: User ko login karo, JWT token do
export const signin = async (req, res) => {
  try {
    // Step 1: Validation errors check karo
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Step 2: Email aur password nikalo
    const { email, password } = req.body;

    // Step 3: Email se user dhundo
    // +password kyunki model mein select:false kiya tha, explicitly include karo
    const user = await User.findOne({ email: email }).select('+password');

    if (!user) {
      // User nahi mila - DELIBERATELY vague message (security reason)
      // "Email not found" mat likho - hackers ko pata lag jaayega kaunsi email registered hai
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Step 4: Password compare karo
    // bcrypt.compare(entered_password, stored_hashed_password)
    // Ye automatically hash karke compare karta hai
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.', // Same message - security ke liye
      });
    }

    // Step 5: Token banao
    const token = createToken(user._id, user.role);

    // Step 6: Response bhejo
    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}! 🎨`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
    });
  }
};

// ==========================================
// GET PROFILE CONTROLLER
// ==========================================
// Route: GET /api/auth/profile
// Kaam: Logged in user ki profile info do
// Ye protected route hai - sirf logged in users access kar sakte hain
export const getProfile = async (req, res) => {
  try {
    // req.user middleware ne set kiya hoga (auth.middleware.js se)
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong.',
    });
  }
};
