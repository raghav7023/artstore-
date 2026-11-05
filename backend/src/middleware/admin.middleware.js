// ==========================================
// admin.middleware.js
// Sirf admin users ko allow karega
// Enhanced: Verifies admin role from database
// ==========================================

import User from '../models/User.model.js';

export const adminOnly = async (req, res, next) => {
  try {
    // protect middleware ne req.user set kiya hoga
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    // Quick check from JWT-decoded role first
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. Admin only.',
      });
    }

    // Verify from database to ensure role hasn't been revoked
    const dbUser = await User.findById(req.user.id).select('role').lean();
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. Admin only.',
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed.',
    });
  }
};