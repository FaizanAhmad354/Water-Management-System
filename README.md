# 💧 Aqua Control — Smart Water Delivery & Plant Operations 

> A modern, full-stack B2B/B2C Water Jar Delivery & Operations Management Platform featuring QR/OTP delivery verification, advance token quota passes, walk-in plant sales, dynamic RBAC permission controls, and real-time revenue reconciliation.

---

## 📌 Executive Summary

Traditional 20-litre water jar distribution businesses face common operational challenges: unrecorded doorstep deliveries, lost empty jars, cash leakage, route miscommunications, and untracked subscription quotas. 

**Aqua Control** digitizes the entire supply chain through a unified SPA architecture catering to three key user roles:
1. **Customers:** Transparent token balance tracking, automated daily/alternate scheduling, instant on-spot requests, and QR-based contact verification.
2. **Distributors (Delivery Partners):** Mobile-optimized camera QR scanner, 4-digit PIN verification, cash-in-hand logging, instant doorstep quota recharge, and empty jar tracking.
3. **Super Admin / Plant Staff:** Granular module-level Role-Based Access Control (RBAC), live order queues with rejection reasons, direct gate sales, inventory stock tracking (Filled / Empty / Scrap), and daily cash & UPI audit reconciliation.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (SPA Architecture)
- **Routing:** React Router v6
- **State Management & Communication:** Axios instance with JWT interceptors, Persistent LocalStorage sync
- **UI & Icons:** Custom Tailwind/CSS-in-JS design system, centralized inline SVG icon registry (`Icons.jsx`), Responsive 2-column SaaS grids

### Backend
- **Runtime:** Node.js & Express.js (REST API architecture)
- **Database:** MongoDB with Mongoose ODM
- **Authentication & Security:** JWT (JSON Web Tokens), Session guards, Crypto-based OTP & QR token generation
- **Architecture:** Controller-Service-Model pattern with centralized error handling

---

## 🚀 Key Features by Dashboard

### 1. 🏠 Customer Self-Service Dashboard (`CustomerDashboard.jsx`)
- **Fintech Token Pass:** Visual quota card displaying remaining jars, consumption estimate (*"X days left at 1 jar/day"*), and empty jar balance held at home.
- **Quick Order Stepper:** Interactive `[-]` `[Qty]` `[+]` counter (1 to 5 jars) with dynamic billing preview (Quota Token deduction vs. Cash on Delivery).
- **Automated Routine Scheduler:** Configure Daily or Alternate-day recurring delivery routines with single-click **"Pause / Turn Off Auto-Delivery"** functionality.
- **Doorstep Security:** Dynamic QR token and 4-digit numeric OTP generated per approved order for contactless delivery handshakes.
- **Order Audit & Real-time Alerts:** Transparent activity logs displaying delivery statuses (`Delivered`, `Cancelled`) with verified rejection reasons from staff.

### 2. 🚚 Distributor / Delivery Partner Hub (`DistributorDashboard.jsx`)
- **Live Scanner & Queue:** Real-time polling queue for scheduled routes with built-in camera QR scanner and manual 4-digit OTP fallback.
- **Instant Spot Handover:** Instant verification and delivery acceptance for on-spot customer jar requests.
- **Doorstep Token Recharge:** Driver permission-based advance jar recharge directly at the customer's doorstep with instant ledger entry.
- **Gate Walk-In Sale:** Rapid non-registered customer sales recording (Cash / UPI) with empty jar return calculations.
- **Reason-Guided Rejections:** Rejection modal popup capturing delivery failure reasons (Route unavailable, stock finish, timing over, customer unreachable).

### 3. 🛡️ Super Admin & Plant Operations (`AdminDashboard.jsx`)
- **Granular RBAC Permission Matrix:** Custom module permissions for staff across 4 domains:
  - *Order & Counter Operations* (`orders.approve`, `orders.verify_qr`, `orders.instant_onspot`, `orders.cancel`)
  - *Quota & Revenue* (`wallet.recharge`, `wallet.adjust`, `wallet.view_history`)
  - *Plant Inventory* (`inventory.view_stock`, `inventory.empty_jar_return`, `inventory.damaged_jars`)
  - *Master Security* (`settings.role_management`, `settings.price_config`)
- **Daily Reconciliation & Settlement:** Real-time daily cash-in-hand calculation per driver, UPI direct collections, and quota delivery count audits.
- **Live Inventory Ledger:** Tracking ready-to-dispatch filled jars, empty jars returned from delivery runs, and scrap/damaged bottles with failure logging.
- **Plant Counter Direct Sales:** Fast cashier terminal for walk-in factory sales without user registration requirements.

---

## 🔄 End-to-End Delivery Lifecycle Workflow
[Customer Places Order / Auto-Routine Trigger]
│
▼
[Admin / Staff Approval] ────(Rejected)───► [Order Cancelled + Reason Logged]
│
(Approved)
▼
[QR & 4-Digit OTP Unlocked on Customer App]
│
▼
[Distributor Scans QR or Verifies OTP]
│
├── Auto-deducts Quota Token (if prepaid)
└── Logs Cash / UPI collection (if PayOnDelivery)
│
▼
[Order Status: Delivered]
│
▼
[Driver Settlement & Inventory Empty Jar Return Recorded]


---

## 📂 Project Structure

```text
├── backend/
│   ├── config/              # Database connection & env configurations
│   ├── controllers/         # Core business logic
│   │   ├── orderController.js
│   │   ├── userController.js
│   │   ├── walletController.js
│   │   └── inventoryController.js
│   ├── models/              # Mongoose schemas (Order, User, Inventory, WalletLog)
│   ├── routes/              # Express API route endpoints
│   └── server.js            # Node HTTP server entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       └── Icons.jsx       # Centralized modern SVG icon system
    │   ├── features/
    │   │   ├── admin/
    │   │   │   └── AdminDashboard.jsx
    │   │   ├── customer/
    │   │   │   ├── CustomerDashboard.jsx
    │   │   │   └── QrDisplay.jsx
    │   │   └── distributor/
    │   │       ├── DistributorDashboard.jsx
    │   │       └── QrScanner.jsx
    │   ├── services/
    │   │   └── api.js              # Centralized Axios API client
    │   ├── App.jsx
    │   └── index.jsx
⚙️ Local Setup & Installation
Prerequisites
Node.js (v16+ or v18+)

MongoDB (Local instance or MongoDB Atlas URI)

Git

1. Backend Configuration
Bash
cd backend
npm install
Create a .env file in the backend directory:

Code snippet
PORT=5000
MONGO_URI=mongodb://localhost:27017/aquacontrol
JWT_SECRET=your_super_secret_jwt_key
Run the backend server:

Bash
npm run dev
# Server running on http://localhost:5000
2. Frontend Configuration
Bash
cd ../frontend
npm install
npm start
# Client running on http://localhost:3000
🔒 Security & Data Integrity Highlights
Anti-Duplication Guard: Active request validator blocks duplicate pending bookings per customer.

Zero-Downtime Live Polling: Non-blocking background sync intervals refresh delivery queues, token counters, and inventory tallies without browser reloads.

Tamper-Proof Handshakes: Doorstep validation requires either crypto-generated QR scanning or an ephemeral single-use 4-digit PIN.

Strict Role Boundaries: Route-level middleware ensures distributors and customers cannot access privileged plant configuration routes.


---

<ElicitationsGroup>
  <ElicitationItem id="add_api_endpoints">Isme backend ke saare API endpoints ka table bhi add karna hai?</ElicitationItem>
  <ElicitationItem id="add_demo_credentials">Presentation ke liye sample demo login credentials (Admin, Driver, Customer) add kar doon?</ElicitationItem>
  <ElicitationItem id="add_screenshots_section">README mein screenshots lagane ke placeholders format karke doon?</ElicitationItem>
</ElicitationsGroup>
