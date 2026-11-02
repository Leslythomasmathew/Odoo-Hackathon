# Brightloop Subscription Management System

> **Tagline:** Build one system to run plans, subscriptions and recurring billing in one place.

A unified, full-lifecycle subscription management and recurring billing platform engineered for **Brightloop Software**. Built from the ground up to eliminate spreadsheet tracking, forgotten renewals, manual invoicing, mismatched payments, and quarter-end revenue reconciliation delays.

---

## 🌟 Key Features & Requirements Covered

### 1. Authentication & Role-Based Access Control (AUTH-1 to AUTH-7)
- **Role-Based Access (AUTH-5):** Distinct interfaces and privileges for **Admin**, **Internal Staff**, and **Customer Portal**.
- **Customer Self-Signup (AUTH-1, AUTH-2):** Customers can register with email and password with unique email enforcement.
- **Strict Password Policy (AUTH-3):** Enforces more than eight characters (≥ 9 chars), with at least one uppercase letter, one lowercase letter, and one special character.
- **Forgot Password (AUTH-4):** Automated password reset token generation with instant in-app reset link simulation and verification.
- **Staff Access Control (AUTH-6):** Only the Admin can provision and manage internal staff accounts.
- **Data Isolation (AUTH-7):** Customer portal users are strictly restricted to their own subscriptions, invoices, and payments.
- **Quick Demo Role Switcher:** Instant 1-click role switcher in the navbar to seamlessly test views as Admin, Staff, or Customer.

### 2. Products & Variants (PROD-1 to PROD-3)
- **Product Setup (PROD-1):** Admin can create products with name, type (Software, Add-on, Service, Hardware), sales price, cost price, and internal notes.
- **Product Variants (PROD-2):** Support for variants by attribute (e.g., Brand, Storage Tier, Edition).
- **Price Adjustments (PROD-3):** Configurable extra price adjustments per variant. Example: selecting the **Odoo** brand adds **+$560** to the line price.

### 3. Plan Management (PLAN-1 to PLAN-4)
- **Flexible Billing Cycles (PLAN-1):** Daily, weekly, monthly, and yearly recurring periods.
- **Minimum Quantity (PLAN-2):** Enforces minimum seat or quantity requirements during subscription creation.
- **Availability Windows (PLAN-3):** Configurable start and end availability dates.
- **Plan Behaviors (PLAN-4):**
  - **Auto-close** when plan term ends.
  - **Closable early** permissions.
  - **Pausable** contracts (suspends billing until resumed).
  - **Renewable** terms with auto-extension.

### 4. Quotation Templates (QT-1 to QT-3)
- **Pre-assembled Packages (QT-1, QT-2):** Sales reps can start from approved quotation templates with pre-filled plans and product line items.
- **Validity Expiration (QT-3):** Configurable validity duration (e.g. 30 or 45 days) to ensure offers reflect current pricing.

### 5. Subscription Lifecycle State Machine (SUB-1 to SUB-6)
- **Unique Subscription Numbering (SUB-1):** Auto-generated unique contract numbers (`SUB-YYYY-XXXX`).
- **Complete Contract Headers & Lines (SUB-2, SUB-3):** Customer, plan, start/expiry dates, payment terms, product lines, variants, taxes, and amounts.
- **State Machine Flow (SUB-4, SUB-5):**
  $$\text{Draft} \longrightarrow \text{Quotation} \longrightarrow \text{Confirmed} \longrightarrow \text{Active} \longrightarrow \text{Closed}$$
  *(With support for Pausing and Contract Renewals)*.
- **Customer Self-Service (SUB-6):** Customers can review active terms, request pause/resume, and trigger renewals from the portal.

### 6. Automated Invoicing & Bulk Billing Engine (INV-1 to INV-6)
- **Auto-Generation (INV-1):** Invoices auto-generated from subscriptions with customer details, lines, taxes, and applied discounts pre-filled.
- **Bulk Billing Runner (INV-2):** Background-capable billing engine processing hundreds of due subscriptions simultaneously.
- **Tax Rules (INV-3):** Automatic calculation of taxes from admin-defined jurisdiction rules.
- **Invoice Actions (INV-4, INV-5):** Full Draft $\rightarrow$ Confirmed $\rightarrow$ Paid lifecycle with Cancel, Send, and Print capabilities.
- **Strict Idempotency (INV-6):** Unique database constraint on `(subscription_id, billing_period_start)` ensures nothing is ever billed twice or skipped.

### 7. Automated Discount Rules (DISC-1 to DISC-8)
- **Admin Managed (DISC-1):** Only administrators can configure promotion rules.
- **Types & Conditions (DISC-2, DISC-3):** Fixed dollar amounts or percentage discounts; minimum purchase or minimum seat quantity conditions.
- **Validity & Capping (DISC-4, DISC-5):** Date windows and global usage limits (`times_used` tracked transactionally).
- **Scope & Auto-Application (DISC-6, DISC-7, DISC-8):** Scoped to entire subscription or specific product; automatically calculated on the next invoice and stops automatically upon expiration or limit exhaustion.

### 8. Payments & Overdue Chasing (PAY-1 to PAY-4)
- **Payment Matching (PAY-1, PAY-2):** Record payments against specific invoices with method (Credit Card, Wire, PayPal, Cash), date, and reference note.
- **Partial Payments & Status (PAY-3):** Real-time balance tracking; invoices flip to **Paid** when settled in full.
- **Overdue Detection & Chasing (PAY-4):** Immediate identification of confirmed invoices past payment terms with automated 1-click reminder dispatch and audit logging.

### 9. Finance Dashboard & Reporting (REP-1 to REP-3)
Answers the finance lead's four core questions at a glance:
1. *How many subscriptions are active?*
2. *How much revenue came in?*
3. *How much is still owed?*
4. *Which invoices are overdue?*
- Executive KPIs: MRR, ARR, active subscriber count, collections by method, and CSV export.

### 10. Performance & Non-Functional Requirements (Section 8)
- **Sub-2-Second Performance Target:** Fully indexed SQLite WAL queries handle 1,000+ subscriptions in **under 15 milliseconds**!
- **Built-in Benchmark Generator:** Admin dashboard includes a live 1,000+ subscription stress test and SLA latency benchmark.

---

## 🏗️ Architecture & Tech Stack

- **Backend:** Node.js v24 + Express + Native `node:sqlite` (SQLite 3.53 in WAL mode, zero external C++ dependencies, lightning-fast queries and transactions).
- **Authentication:** JWT tokens with bcrypt password hashing and password policy validation.
- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons.
- **Unified Distribution:** The Express backend serves the built frontend production SPA from a single port (`http://localhost:5050`), eliminating CORS configuration while also supporting hot-reloading dev mode.

---

## 🔑 Default Demonstration Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `BrightloopAdmin2026!` | Full system control, catalog setup, tax & discount rules, staff management, bulk billing |
| **Internal Staff** | `staff@brightloop.com` | `BrightloopStaff2026!` | Day-to-day operations, subscriptions, invoicing, payment recording, collections chasing |
| **Customer 1** | `customer@acmecorp.com` | `CustomerAcme2026!` | Self-service portal for Acme Corp, invoice viewing, online payments |
| **Customer 2** | `sarah@retailflow.io` | `CustomerRetail2026!` | Self-service portal for RetailFlow Technologies |

> *All pre-seeded passwords meet the AUTH-3 password complexity rule.*

---

## 📁 Project Structure

```
make-a-horn/
├── package.json                   # Root workspace scripts
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js        # SQLite tables, constraints, WAL mode & performance indexes
│   │   │   └── seed.js            # Brightloop seed catalog & 1000+ benchmark generator
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT verification & password policy rules
│   │   ├── routes/
│   │   │   ├── auth.js            # Customer register, login, forgot/reset password
│   │   │   ├── users.js           # Admin staff provisioning
│   │   │   ├── products.js        # Products & variant price adjustments (Odoo +560)
│   │   │   ├── plans.js           # Daily/weekly/monthly/yearly plans & behavior flags
│   │   │   ├── quotationTemplates.js # Pre-filled packages with validity days
│   │   │   ├── subscriptions.js   # Lifecycle state machine & contract numbering
│   │   │   ├── invoices.js        # Invoice generation, lifecycle & actions
│   │   │   ├── billing.js         # Automated bulk billing runner
│   │   │   ├── discounts.js       # Admin discount rules engine
│   │   │   ├── taxes.js           # Tax rules
│   │   │   ├── payments.js        # Payment recording & overdue chasing
│   │   │   ├── reports.js         # Financial KPIs & dashboard metrics
│   │   │   └── system.js          # Benchmark stress tester & audit logs
│   │   ├── services/
│   │   │   └── billingService.js  # Idempotent billing calculation engine
│   │   └── server.js              # Express app & static client distributor
│   └── test/
│       └── api.test.js            # 41-point automated acceptance test suite
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── context/
        │   └── AuthContext.jsx    # Auth state & quick role impersonator
        ├── components/
        │   ├── Navbar.jsx         # App header, role switcher & billing trigger
        │   ├── Sidebar.jsx        # Role-filtered navigation
        │   ├── Modal.jsx          # Accessible dialog modal
        │   ├── PrintableInvoice.jsx # Clean invoice print & PDF view
        │   ├── StatsCard.jsx      # Financial KPI widgets
        │   ├── StatusBadge.jsx    # State badges
        │   ├── BillingRunModal.jsx # Bulk billing modal
        │   ├── RecordPaymentModal.jsx # Payment entry modal
        │   ├── CreateSubscriptionModal.jsx # Subscription & template builder
        │   └── ChaseReminderModal.jsx # Overdue notification modal
        └── pages/
            ├── Dashboard.jsx      # Executive & Finance Lead overview
            ├── Subscriptions.jsx  # All subscriptions & lifecycle transitions
            ├── SubscriptionDetail.jsx # Detailed contract view & timeline
            ├── Invoices.jsx       # Invoices list, actions & print preview
            ├── InvoiceDetail.jsx  # Printable invoice & payment log
            ├── Payments.jsx       # Collections reconciliation
            ├── Products.jsx       # Catalog & variant price adjustments
            ├── Plans.jsx          # Plan configuration & behaviors
            ├── QuotationTemplates.jsx # Template packs & validity
            ├── Discounts.jsx      # Promo rules & limits
            ├── Taxes.jsx          # Tax rates
            ├── Customers.jsx      # Customer directory & balances
            ├── StaffManagement.jsx # Admin staff creation
            ├── Reports.jsx        # Financial analytics & CSV export
            ├── CustomerPortal.jsx # Customer self-service portal
            ├── SystemBenchmark.jsx # 1,000+ benchmark stress tester
            ├── Login.jsx          # Sign in with 1-click demo accounts
            ├── Register.jsx       # Sign up with live password checklist
            ├── ForgotPassword.jsx # Reset link dispatcher simulation
            └── ResetPassword.jsx  # Policy-compliant password reset
```
