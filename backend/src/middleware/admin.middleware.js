// ==========================================
// admin.middleware.js
// Sirf admin users ko allow karega
// ==========================================

export const adminOnly = (req, res, next) => {

    // protect middleware ne req.user set kiya hoga
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized.",
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access Denied. Admin only.",
        });
    }

    next();

};