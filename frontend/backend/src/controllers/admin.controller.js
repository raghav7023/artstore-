import User from '../models/User.model.js';
import Order from '../models/Order.model.js';
import PaymentAttempt from '../models/PaymentAttempt.model.js';
import EmailLog from '../models/EmailLog.model.js';
import AuditLog from '../models/AuditLog.model.js';
import { sendOrderEmails } from '../utils/emailService.js';

// Helper: Create audit log
const logAdminAction = async (action, performedBy, targetType, targetId, details = {}, ipAddress = '') => {
  try {
    await AuditLog.create({ action, performedBy, targetType, targetId: String(targetId), details, ipAddress });
  } catch (err) {
    console.warn('⚠️ [AuditLog] Failed to create audit log:', err.message);
  }
};

// GET /api/admin/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalOrders, totalPayments, totalProducts, emailStats, orderStats, paymentStats, revenueResult] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      PaymentAttempt.countDocuments(),
      // Products are from static catalog, count them
      Promise.resolve(0), // Will be replaced with catalog count
      EmailLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PaymentAttempt.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    // Import products count
    const { products: catalogProducts } = await import('../data/products.data.js');

    // Parse email stats
    const emailStatsMap = {};
    emailStats.forEach(s => { emailStatsMap[s._id] = s.count; });

    // Parse order stats
    const orderStatsMap = {};
    orderStats.forEach(s => { orderStatsMap[s._id] = s.count; });

    // Parse payment stats
    const paymentStatsMap = {};
    paymentStats.forEach(s => { paymentStatsMap[s._id] = s.count; });

    // Monthly revenue (last 12 months)
    const monthlyRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$total' },
        orderCount: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Monthly registrations (last 12 months)
    const monthlyRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers: totalUsers, // All users are customers
        totalOrders,
        totalProducts: catalogProducts?.length || 0,
        totalRevenue: revenueResult[0]?.total || 0,
        ordersByStatus: orderStatsMap,
        paymentsByStatus: paymentStatsMap,
        emailsByStatus: emailStatsMap,
        totalEmailsSent: emailStatsMap.sent || 0,
        totalEmailsFailed: emailStatsMap.failed || 0,
        totalSuccessfulPayments: paymentStatsMap.paid || 0,
        totalPendingPayments: paymentStatsMap.created || 0,
        totalCancelledOrders: orderStatsMap.Cancelled || 0,
      },
      charts: {
        monthlyRevenue,
        monthlyRegistrations,
      },
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
};

// GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ],
      };
      // Also try matching by ObjectId if the search looks like one
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        filter.$or.push({ _id: search });
      }
    }

    // Date filter
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.createdAt.$lte = new Date(req.query.toDate);
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Enrich with order stats
    const userIds = users.map(u => u._id);
    const orderAggs = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$total' },
        latestOrderDate: { $max: '$createdAt' },
      }},
    ]);
    const orderMap = {};
    orderAggs.forEach(a => { orderMap[a._id.toString()] = a; });

    const enrichedUsers = users.map(u => ({
      ...u,
      totalOrders: orderMap[u._id.toString()]?.totalOrders || 0,
      totalSpent: orderMap[u._id.toString()]?.totalSpent || 0,
      latestOrderDate: orderMap[u._id.toString()]?.latestOrderDate || null,
    }));

    res.status(200).json({
      success: true,
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// GET /api/admin/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [orders, emailLogs] = await Promise.all([
      Order.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
      EmailLog.find({ relatedUser: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    // Payment history
    const payments = await PaymentAttempt.find({ user: user._id }).sort({ createdAt: -1 }).lean();

    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    res.status(200).json({
      success: true,
      user: {
        ...user,
        totalOrders: orders.length,
        totalSpent,
      },
      orders,
      payments,
      emailLogs,
    });
  } catch (error) {
    console.error('Get User By Id Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
};

// GET /api/admin/orders
export const getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status || '';
    const payment = req.query.payment || '';

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        filter.$or.push({ _id: search });
      }
    }
    if (status) filter.status = status;
    if (payment) filter.payment = new RegExp(payment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Date filter
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.createdAt.$lte = new Date(req.query.toDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get Admin Orders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// GET /api/admin/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const [emailLogs, payment] = await Promise.all([
      EmailLog.find({ relatedOrder: order._id }).sort({ createdAt: -1 }).lean(),
      PaymentAttempt.findOne({ razorpay_order_id: order.razorpay?.order_id }).lean(),
    ]);

    res.status(200).json({
      success: true,
      order,
      emailLogs,
      payment,
    });
  } catch (error) {
    console.error('Get Order By Id Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    await logAdminAction('update_order_status', req.user.id, 'order', order._id, {
      previousStatus,
      newStatus: status,
    }, req.ip);

    res.status(200).json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

// GET /api/admin/payments
export const getAdminPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search ? req.query.search.trim() : '';

    let filter = {};
    if (status) filter.status = status;
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { razorpay_order_id: searchRegex },
      ];
      if (/^[0-9a-fA-F]{24}$/.test(search)) {
        filter.$or.push({ _id: search });
      }
    }

    const [payments, total] = await Promise.all([
      PaymentAttempt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PaymentAttempt.countDocuments(filter),
    ]);

    // Enrich with order info
    const enrichedPayments = await Promise.all(
      payments.map(async (p) => {
        const order = await Order.findOne({ 'razorpay.order_id': p.razorpay_order_id }).select('_id status').lean();
        return { ...p, linkedOrder: order || null };
      })
    );

    res.status(200).json({
      success: true,
      payments: enrichedPayments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get Admin Payments Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// GET /api/admin/emails
export const getAdminEmails = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || '';
    const emailType = req.query.emailType || '';
    const search = req.query.search ? req.query.search.trim() : '';

    let filter = {};
    if (status) filter.status = status;
    if (emailType) filter.emailType = emailType;
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { recipient: searchRegex },
        { recipientName: searchRegex },
        { subject: searchRegex },
      ];
    }

    const [emails, total] = await Promise.all([
      EmailLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      EmailLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      emails,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get Admin Emails Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email logs' });
  }
};

// GET /api/admin/emails/:id
export const getEmailById = async (req, res) => {
  try {
    const email = await EmailLog.findById(req.params.id).lean();
    if (!email) return res.status(404).json({ success: false, message: 'Email log not found' });

    res.status(200).json({ success: true, email });
  } catch (error) {
    console.error('Get Email By Id Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email details' });
  }
};

// POST /api/admin/emails/:id/retry
export const retryEmail = async (req, res) => {
  try {
    const emailLog = await EmailLog.findById(req.params.id);
    if (!emailLog) return res.status(404).json({ success: false, message: 'Email log not found' });

    if (emailLog.status === 'sent' || emailLog.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Email was already sent successfully. Cannot retry.' });
    }

    if (emailLog.attemptCount >= emailLog.maxAttempts) {
      return res.status(400).json({ success: false, message: `Maximum retry attempts (${emailLog.maxAttempts}) reached.` });
    }

    // Find the related order to resend
    if (!emailLog.relatedOrder) {
      return res.status(400).json({ success: false, message: 'No related order found for this email. Cannot retry.' });
    }

    const order = await Order.findById(emailLog.relatedOrder);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Related order not found.' });
    }

    // Retry using force flag
    const emailResult = await sendOrderEmails(order.toObject(), { force: true });

    // Update the log entry
    const retrySuccess = emailLog.emailType.includes('owner')
      ? emailResult?.owner?.success
      : emailResult?.customer?.success;
    const retryError = emailLog.emailType.includes('owner')
      ? emailResult?.owner?.error
      : emailResult?.customer?.error;

    emailLog.attemptCount += 1;
    emailLog.lastAttemptAt = new Date();
    emailLog.status = retrySuccess ? 'sent' : 'failed';
    emailLog.errorMessage = retrySuccess ? '' : (retryError || 'Retry failed');
    if (retrySuccess) {
      const retryResult = emailLog.emailType.includes('owner') ? emailResult?.owner : emailResult?.customer;
      emailLog.providerMessageId = retryResult?.messageId || '';
      emailLog.provider = retryResult?.provider || 'resend';
    }
    await emailLog.save();

    await logAdminAction('retry_email', req.user.id, 'email', emailLog._id, {
      success: retrySuccess,
      attemptCount: emailLog.attemptCount,
    }, req.ip);

    res.status(200).json({
      success: true,
      message: retrySuccess ? 'Email retry successful' : 'Email retry failed',
      emailLog,
    });
  } catch (error) {
    console.error('Retry Email Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retry email' });
  }
};

// PATCH /api/admin/users/:id/status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be "active" or "inactive".' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Security: Prevent deactivating own admin account
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own admin account.' });
    }

    const previousStatus = user.status || 'active';
    user.status = status;
    await user.save();

    await logAdminAction('update_user_status', req.user.id, 'user', user._id, {
      previousStatus,
      newStatus: status,
    }, req.ip);

    res.status(200).json({
      success: true,
      message: `User account ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Update User Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

// GET /api/admin/products
export const getAdminProducts = async (req, res) => {
  try {
    const { products: catalogProducts } = await import('../data/products.data.js');
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    const category = req.query.category ? req.query.category.toLowerCase().trim() : '';

    let items = catalogProducts || [];
    if (category) {
      items = items.filter(p => p.category?.toLowerCase() === category);
    }
    if (search) {
      items = items.filter(p =>
        p.name?.toLowerCase().includes(search) ||
        p.category?.toLowerCase().includes(search) ||
        p.subcategory?.toLowerCase().includes(search) ||
        String(p.id).includes(search)
      );
    }

    const categories = Array.from(new Set(catalogProducts.map(p => p.category).filter(Boolean)));

    res.status(200).json({
      success: true,
      total: items.length,
      categories,
      products: items,
    });
  } catch (error) {
    console.error('Get Admin Products Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch catalog products.' });
  }
};

// GET /api/admin/settings
export const getSystemSettings = async (req, res) => {
  try {
    const {
      RESEND_API_KEY,
      RESEND_FROM,
      EMAIL_USER,
      EMAIL_PASSWORD,
      ORDER_NOTIFICATION_EMAIL,
      RAZORPAY_KEY_ID,
    } = await import('../../Config.mjs');

    const recentAuditLogs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const isResendConfigured = Boolean(RESEND_API_KEY);
    const isSmtpConfigured = Boolean(EMAIL_USER && EMAIL_PASSWORD);
    const isSandboxSender = Boolean(RESEND_FROM && RESEND_FROM.includes('@resend.dev'));

    const senderDomain = RESEND_FROM.match(/@([^>]+)/)?.[1] || '';

    const diagnostics = {
      emailService: {
        provider: isResendConfigured ? 'Resend (Port 443 HTTPS REST API)' : (isSmtpConfigured ? 'Gmail SMTP' : 'None'),
        resendConfigured: isResendConfigured,
        resendFrom: RESEND_FROM || 'Not set',
        senderDomain,
        isSandbox: isSandboxSender,
        smtpFallbackConfigured: isSmtpConfigured,
        smtpUser: EMAIL_USER ? `${EMAIL_USER.slice(0, 3)}***@${EMAIL_USER.split('@')[1] || ''}` : 'Not set',
        ownerNotificationEmail: ORDER_NOTIFICATION_EMAIL ? `${ORDER_NOTIFICATION_EMAIL.slice(0, 3)}***@${ORDER_NOTIFICATION_EMAIL.split('@')[1] || ''}` : 'Not set',
        resendDomainVerifiedNotice: isSandboxSender
          ? 'Sandbox mode active (@resend.dev). Only verified account owner email can receive messages.'
          : `Custom domain (${senderDomain}). Ensure domain DNS records (DKIM/SPF) are verified in Resend dashboard.`,
      },
      paymentGateway: {
        configured: Boolean(RAZORPAY_KEY_ID),
        keyIdPrefix: RAZORPAY_KEY_ID ? (RAZORPAY_KEY_ID.startsWith('rzp_live') ? 'rzp_live_***' : 'rzp_test_***') : 'Not set',
        mode: RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'Live Production' : 'Test Sandbox',
      },
      system: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'production',
        uptimeSeconds: Math.floor(process.uptime()),
        databaseState: 'Connected (MongoDB Atlas)',
      },
      recentAuditLogs,
    };

    res.status(200).json({ success: true, settings: diagnostics });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system settings.' });
  }
};
