# Brightloop Software — Subscription Management System (Customer Portal)

> **Odoo Hackathon Challenge**: Build one unified software platform that runs the full life of a subscription business, from setting up products and plans to sending invoices, collecting payments, and reporting revenue.

This project delivers the **Customer User Portal** designed with a **casual, modern, and accessible design system**. It features end-to-end self-service subscription management, real-time automated recurring invoicing, client-side PDF invoice generation, and an automated discount rule-matching engine.

---

## 🌟 Key Features Implemented

### 1. Casual & Friendly Authentication
* **Account Creation (Sign Up)**:
  * Clean, blank input fields with intuitive placeholder guidance (`name@company.com`, `e.g. Jane Doe`) — no pre-filled default values.
  * **Unique Email Validation**: Real-time checking against registered accounts with clear inline feedback (`✓ Email is available!` or `✕ Email is already registered`).
* **Strong Password Policy**:
  * Strict policy compliance: **more than 8 characters** (> 8 chars / 9+ chars), at least **one uppercase letter** (`A-Z`), at least **one lowercase letter** (`a-z`), and at least **one special character** (`!@#$%^&*`).
  * Real-time 4-criteria checklist with interactive green checkmarks.
  * Visual strength progress meter bar (`Weak ⏳` $\rightarrow$ `Fair 👍` $\rightarrow$ `Good 💪` $\rightarrow$ `Super strong password! 🚀`).
  * Password visibility toggle (`👁️ Show` / `🙈 Hide`).
* **"Forgot Password" & Reset Flow**:
  * Enter registered email address to request a password reset.
  * System dispatches a secure reset token link to the registered email address.
  * **Interactive Simulated Inbox**: Displays an instant notification card:
    > 📬 **Simulated Email Received!**  
    > A reset link was generated and dispatched to *your-email*.  
    > **[ 👉 Click Here to Open Reset Link ]**
  * **Set New Password Screen**: Enforces the strong password checklist, updates the password in the database, and automatically logs the customer in with celebratory confetti.
* **Direct Log Out**:
  * A dedicated **`👋 Log Out`** button is placed directly in the main navigation bar (and within the profile menu) for one-click secure sign-out.

---

### 2. My Subscriptions (Isolated Customer Cards)
* **Customer Isolation**: Each customer sees strictly their own subscriptions.
* **Subscription Cards**:
  * Subscription code (e.g., `SUB-2026-001`).
  * Plan name and billing cadence (Monthly, Weekly, Yearly).
  * Status badge (`Active`, `Paused`, `Closed`).
  * Start date, expiry date, and next scheduled billing date.
  * Product lines and variants (e.g., *Brightloop Business Suite* with *Odoo Brand Integration* adding €560/mo).
  * Auto-applied discount banner displaying matching rules and savings.
  * Total recurring amount per cycle (including automated taxes).
* **Self-Service Controls (No email required)**:
  * **Change Quantity**: Stepper modal to increase or decrease seat/license counts. Enforces plan minimum quantity (e.g., min 3 seats) and recalculates recurring costs immediately.
  * **Pause & Resume**: Pause active subscriptions or resume paused plans without support tickets.
  * **Close Subscription**: Cancel or close subscriptions early if allowed by plan policy, with cancellation reason tracking.
  * **Plan Policy Enforcement**: Restricts early close or pauses if the plan is locked (e.g., Annual Committed Growth contracts).

---

### 3. My Invoices (Status & PDF Generation)
* **Filtered List**: Filter invoices by `All`, `Outstanding`, or `Paid`.
* **Invoice Summary Cards**: Total invoiced, paid-to-date, outstanding balance, and tax compliance indicators.
* **Invoice Details Modal**:
  * Branded Brightloop header and issuer credentials.
  * Billed-to customer information and tax ID.
  * Itemized product lines with quantity, unit price, and subtotal.
  * **Automated Discounts as Separate Lines**: Itemized negative deductions clearly labeled (e.g., `[AUTO DISCOUNT] High-Volume Seat Discount (15%) - -$1,259.25`).
  * Automated tax calculation (Standard VAT 18%).
  * Status banner and payment reference details if paid.
* **Direct PDF Generation (`jsPDF`)**:
  * Clicking **"Download PDF"** generates and saves an official, high-resolution vector PDF (`Brightloop_Invoice_INV-XXXX.pdf`) directly in the browser.

---

### 4. Payments & Checkout
* **Pay Outstanding Invoices**:
  * Direct **"Pay Now"** button on outstanding invoices opens an interactive checkout modal.
  * Supports Credit/Debit Card and Direct Bank Wire Transfer.
  * All payment fields start clean and empty (no pre-filled card numbers).
  * Real-time payment processing animation followed by a celebration confetti blast.
  * Shifts invoice status from `Outstanding` to `Paid`, records cleared transaction details, and updates balances.
* **Payment History Ledger**:
  * Complete transaction audit log with payment reference (`PAY-2026-XXXX`), invoice number, timestamp, payment method, amount, and notes.
  * Downloadable receipt PDF for every settled payment.

---

### 5. Automated Discount Engine
* **Zero Coupon Codes**: Customers never enter or search for discount codes manually.
* **Rule-Matching Engine**:
  * Evaluates subscription parameters automatically:
    1. **High-Volume Seat Discount (15%)**: Automatically triggers when subscription seats $\ge 10$.
    2. **Odoo Ecosystem Incentive ($50 Flat)**: Automatically applies if the subscription includes the Odoo Brand variant.
    3. **High-Spender Credit ($100 Flat)**: Triggers when order volume exceeds $5,000.
* **Auto-Termination**:
  * Disables automatically once a discount reaches its **usage limit** (e.g., max 12 billing cycles) or passes its **expiry date**.
* **Automated Discounts View**:
  * Dedicated portal tab giving customers complete transparency on all active company rules, eligibility criteria, and their live recurring monthly savings.

---

### 6. Simulation & Evaluator Hub
* **Billing Day Simulator**:
  * Click **"Run Billing Day"** in the navigation bar or the floating **"Simulation Hub"** button.
  * Simulates the scheduled recurring billing event: creates the next invoice from the subscription, applies discount rules, calculates taxes, and advances the next billing date.
  * Prevents double-billing for the same cycle.
* **Simulated Email Outbox**:
  * Inspect dispatched password reset emails and tokens.
* **Database Reset**:
  * One-click restore back to default seed data anytime.

---

## 👥 Default Accounts in Code

The sample seed accounts are defined in [`src/services/db.js`](src/services/db.js) under `INITIAL_DATA.users`:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Customer 1** | Sarah Jenkins | `sarah@acme.com` | `Password123!` | Acme Corp • Enterprise Monthly • Odoo Brand Variant • Outstanding Invoice ready to pay |
| **Customer 2** | David Miller | `david@startuplab.io` | `Password123!` | StartupLab • Annual Committed Plan • 5 Seats |
| **Admin** | Alex Vance | `admin@brightloop.com` | `AdminPassword2026!` | Brightloop Administrator |

> **Note**: You can sign in with these existing sample accounts to evaluate pre-configured subscriptions and invoices, or create completely new customer accounts via **Create Account**.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules)
* **Styling**: Vanilla CSS3 (Casual & Clean Modern Design System, modern CSS variables, responsive grid, flexbox, micro-animations)
* **Typography**: Google Fonts (*Plus Jakarta Sans* & *Outfit*)
* **Build Tool & Dev Server**: Vite 8.3
* **PDF Engine**: `jspdf` (High-fidelity client-side vector invoice generator)
* **Animations**: `canvas-confetti` (Celebration micro-interactions)
* **Persistence**: LocalStorage database service with automatic fallback (`src/services/db.js`)

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+ (tested on Node v24)
* npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
👉 **`http://localhost:5173/`**

### 3. Build for Production
```bash
npm run build
```
Generates optimized, minified static assets in the `dist/` directory.

---

## 📁 Project Structure

```
├── index.html                     # HTML entry with SEO metadata and font preconnects
├── package.json                   # Scripts and dependencies (vite, jspdf, canvas-confetti)
├── README.md                      # Comprehensive project documentation
├── public/
│   └── logo.jpg                   # Brightloop brand logo asset
└── src/
    ├── main.js                    # Application orchestrator and tab router
    ├── style.css                  # Casual, friendly modern design system
    ├── components/
    │   ├── Navbar.js              # Header navigation, tab switcher, user pill & Log Out button
    │   ├── AuthModal.js           # Casual account creation, login, password strength & reset flows
    │   ├── SubscriptionsView.js   # Subscription cards, quantity adjustment, pause, and close modals
    │   ├── InvoicesView.js        # Invoices list, details modal, pay trigger, and PDF downloader
    │   ├── PaymentsView.js        # Payment history table and interactive checkout modal
    │   ├── DiscountsView.js       # Automated discount engine status and transparency board
    │   └── SimulationDrawer.js    # Simulation hub for Billing Day, outbox inspection, and DB reset
    ├── services/
    │   ├── db.js                  # Centralized database with initial seed data and LocalStorage sync
    │   ├── auth.js                # Session service, email uniqueness, password criteria validation
    │   ├── billingService.js      # Invoice generator, self-service adjustments, tax and payment logic
    │   ├── discountEngine.js      # Automated discount rule evaluation and usage limit decrementer
    │   └── pdfService.js          # jsPDF invoice and receipt PDF generator
    └── utils/
        └── toast.js               # Floating notification toast utility
```
