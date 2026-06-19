// ==========================================
// User.model.js - User ka Database Schema
// ==========================================
// Purpose: Ye file bataati hai ki MongoDB mein 
//          User ka data kaise store hoga
// Schema = Database table ka blueprint (jaisa ki design)

import mongoose from 'mongoose';

// Schema banao - ye define karta hai ki user document
// mein kya kya fields hongi
const userSchema = new mongoose.Schema(
  {
    // User ka naam
    name: {
      type: String,        // Text hoga
      required: [true, 'Name is required'],  // Required field
      trim: true,          // Extra spaces hatao automatically
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    // User ki email - unique honi chahiye (2 users same email se nahi register kar sakte)
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,        // Duplicate emails allowed nahi
      trim: true,
      lowercase: true,     // Email ko lowercase mein save karo
      // Basic email format check
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    // Password - hum KABHI bhi plain password save nahi karte!
    // Hamesha hashed password save hota hai (bcrypt use karte hain)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // select: false means password ko query mein automatically include mat karo
      // Ye security ke liye hai - password accidently expose na ho
      select: false,
    },

    // Mobile number (optional)
    phone: {
      type: String,
      trim: true,
      default: '',
    },

    // Role: 'user' ya 'admin'
    // Admin products add/delete kar sakta hai
    // User sirf shop kar sakta hai
    role: {
      type: String,
      enum: ['user', 'admin'], // Sirf ye 2 values allowed hain
      default: 'user',         // Default role = user
    },
  },
  {
    // timestamps: true automatically 2 fields add karta hai:
    // createdAt - kab banaya account
    // updatedAt - kab last update hua
    timestamps: true,
  }
);

// Model banao - Model = Schema ka actual usable version
// 'User' = MongoDB collection ka naam (users ho jaata hai automatically)
const User = mongoose.model('User', userSchema);

export default User;
