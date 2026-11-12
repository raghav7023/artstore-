# AI Handoff & Development State Documentation (Artstore Project)

**Current Status:** Completed & Fully Verified (All 22 Integration Tests + 8 Resilience Tests Passing)  
**Date:** November 5, 2026  
**Project Path:** `D:\my projects\artstore`

---

## 1. Project Overview & Architecture
Artstore is a full-stack MERN e-commerce application for handmade art/craft items.
- **Backend:** Node.js (v20+), Express.js (ES Modules, `"type": "module"`), MongoDB via Mongoose.
- **Frontend:** React 19, Vite 8, React Router DOM v7, Vanilla CSS, `react-hot-toast`, `sweetalert2`.
- **Payment:** Razorpay (server-side verification with HMAC-SHA256, atomic `PaymentAttempt` locking).
- **Email:** Dual-engine: primary via Resend HTTPS REST API (Port 443), secondary fallback via Nodemailer Gmail SMTP (Ports 465/587).

---

## 2. Completed Work & Verified Checkpoints

### A. Email Service & Delivery Audit (PART 3 & PART 4)
- **Root Cause Identified:** 
  1. `RESEND_FROM` was set to `"Art Store <orders@artstorestudio.com>"`. However, `artstorestudio.com` was **not verified** on Resend (`statusCode: 403`, `'The artstorestudio.com domain is not verified. Please, add and verify your domain on https://resend.com/domains'`).
  2. When falling back to Gmail SMTP, `mailOptions.from` previously retained the unverified `@artstorestudio.com` domain instead of the authenticated Gmail address (`artstoreofficial07@gmail.com`).
  3. Custom order emails previously hardcoded SMTP from-address and skipped Resend entirely when SMTP credentials were absent.
- **Fixes Applied & Verified:**
  1. Implemented `backend/src/models/EmailLog.model.js` with comprehensive metadata, retry attempt tracking, and indexes.
  2. Enhanced `emailService.js` to log all outgoing emails (customer order, owner order, custom orders) to `EmailLog`.
  3. Fixed SMTP fallback to consistently use `EMAIL_USER` for sender authentication.
  4. Made `createEmailLog` safely handle non-ObjectId mock IDs to prevent Mongoose cast errors.
  5. Implemented Resend Webhook ingestion endpoint (`POST /api/webhooks/resend`) with Svix signature verification and idempotent state transitions for `email.delivered`, `email.bounced`, `email.complained`.
  6. Verified against `tests/emailNotification.test.mjs` — **8 out of 8 tests pass cleanly**.

### B. Admin Authorization & Security (PART 5)
- Enhanced `backend/src/middleware/admin.middleware.js` to perform two-tier authorization:
  1. Fast check on JWT payload (`req.user.role === 'admin'`).
  2. Real-time database verification on MongoDB `User` document (`role === 'admin'`).
- Added `status: ['active', 'inactive']` and `lastLoginAt` fields to `User.model.js`.
- Added account status enforcement on login in `auth.controller.js` (inactive accounts blocked with HTTP 403).
- Implemented `AuditLog.model.js` to record sensitive admin actions (e.g. order status change, user status change, email retry).
- Protected all admin routes with `adminOnly` and rate limiters.

### C. Admin Backend APIs (PART 7)
- Implemented `backend/src/controllers/admin.controller.js` and `backend/src/routes/admin.routes.js`:
  - `GET /api/admin/dashboard` — Aggregated real data (users, orders, payments, revenue, monthly charts).
  - `GET /api/admin/users` — Paginated user directory with search, order count, total spent, and status.
  - `GET /api/admin/users/:id` — User profile, order history, payment history, email history.
  - `PATCH /api/admin/users/:id/status` — Activate/deactivate user accounts with audit logging.
  - `GET /api/admin/products` — Catalog products with category filtering and text search.
  - `GET /api/admin/orders` — Orders with status filters, text search, pagination.
  - `GET /api/admin/orders/:id` — Order detail with products, payment attempt, and email logs.
  - `PATCH /api/admin/orders/:id/status` — Status update with validation and audit logging.
  - `GET /api/admin/payments` — Razorpay payment attempts with status filters and linked orders.
  - `GET /api/admin/emails` — Email logs with filters (status, type, search).
  - `GET /api/admin/emails/:id` — Detailed email log inspection.
  - `POST /api/admin/emails/:id/retry` — Idempotent email retry with max retry safeguard.
  - `GET /api/admin/settings` — Safe system health and diagnostics without secret exposure.
- Registered `/api/admin` and `/api/webhooks/resend` in `backend/index.mjs`.

### D. Admin Frontend Dashboard (PART 2 & PART 6)
- Built modular Admin components in `frontend/src/components/Admin/`:
  - `AdminLayout.jsx` & `AdminLayout.css` (Strict auth guard against `/api/auth/profile`, collapsible responsive sidebar with all 7 standard sections).
  - `Dashboard.jsx` & `Dashboard.css` (Key metrics, CSS monthly revenue chart, order status distribution, registration trend).
  - `UserList.jsx` (Search, pagination, total spent, order count, account status badge, activate/deactivate action).
  - `UserDetail.jsx` (Profile card, account status toggle, tabbed navigation for user orders, payments, emails).
  - `ProductList.jsx` (Catalog browser with category filters, image thumbnails, prices).
  - `OrderList.jsx` & `OrderDetail.jsx` (Filter pills, status updater with SweetAlert2).
  - `PaymentList.jsx` (Gateway attempts, linked orders).
  - `EmailList.jsx` (Log viewer, modal inspector, retry button with confirmation).
  - `Settings.jsx` (Email service diagnostics, Razorpay mode, system health, audit logs).
  - `AdminPages.css` (Unified styling matching Artstore brand, responsive tables and modals).
- Updated `frontend/src/App.jsx` with nested `/admin` routes.
- Updated `frontend/src/components/Navbar/Navbar.jsx` to hide Admin link from customers and show only to users with `role: 'admin'`.
- Production build `vite build` completed cleanly without errors.

---

## 3. Verification & Test Results
- **Unit & Resilience Suite:** `npm test` in `backend` — **8/8 tests pass (100%)**.
- **End-to-End Integration Suite:** `npm run smoke-test` in `backend` — **22/22 tests pass (100%)**:
  1. Server health check.
  2. Catalog synchronization & single product lookup.
  3. Weak password rejection.
  4. Valid user registration.
  5. Duplicate email rejection (409 Conflict).
  6. Invalid password rejection (401) vs valid login (200).
  7. Profile access control.
  8. Cash on Delivery rejection (online-only payment).
  9. Price tampering rejection (server recalculates catalog prices).
  10. Forged Razorpay signature rejection.
  11. Real cryptographic signature verification & order creation.
  12. Idempotent payment verification (prevents duplicate orders).
  13. User order privacy & isolation (prevents order hijacking).
  14. Dynamic UPI QR payment verification & email dispatch.
  15. Server-to-server Razorpay webhook processing.
  16. Admin endpoint security (401 unauthenticated, 403 customer).
  17. Admin access with DB role check, stats & diagnostics.
  18. User management & account deactivation/reactivation.
  19. Order management & status update ('Shipped').
  20. Payment history & email audit logs.
  21. Email retry capability with safeguards.
  22. Resend webhook delivery event processing (`status: 'delivered'`).
- **Frontend Production Build:** `npm run build` in `frontend` — **Clean build in 490ms**.

---

## 4. Environment Variables Checklist for Render Deployment
- `MONGODB_URL`: Required.
- `JWT_SECRET`: Required.
- `RAZORPAY_KEY_ID`: Required.
- `RAZORPAY_KEY_SECRET`: Required.
- `RAZORPAY_WEBHOOK_SECRET`: Recommended for webhook signature verification.
- `RESEND_API_KEY`: Required for Resend email delivery.
- `RESEND_FROM`: **Must be verified in Resend**.
  - If using custom domain (`orders@artstorestudio.com`), DNS records (DKIM, SPF, MX) must be active and verified in the Resend dashboard (`https://resend.com/domains`).
  - If not yet verified, set `RESEND_FROM="Art Store <onboarding@resend.dev>"` for sandbox testing to the account owner's email address, or configure Gmail SMTP fallback.
- `EMAIL_USER`: Required for Gmail SMTP fallback (`artstoreofficial07@gmail.com`).
- `EMAIL_PASSWORD`: Required Gmail App Password for SMTP fallback.
- `ORDER_NOTIFICATION_EMAIL`: Target recipient for store owner alerts (`artstoreofficial07@gmail.com` or `owner@artstorestudio.com`).
- `RESEND_WEBHOOK_SECRET`: Optional Svix webhook secret for validating inbound delivery events from Resend.
