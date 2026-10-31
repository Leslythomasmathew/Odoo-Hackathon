import express from 'express';
import { db } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate unique ticket number
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TICK-${year}-${rand}`;
}

// ---------------------------------------------------------------------------
// 1. CHATBOT ASSISTANT ENDPOINT (POST /api/support/chat)
// ---------------------------------------------------------------------------
router.post('/chat', authenticate, (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const user = req.user;
    const customer = req.customer;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const query = message.trim().toLowerCase();
    let customerId = customer ? customer.id : null;
    if (!customerId && user.role === 'customer') {
      const cRow = db.prepare('SELECT id, name, email FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email);
      if (cRow) customerId = cRow.id;
    }

    // Fetch customer's live database context
    let activeSubs = [];
    let allSubs = [];
    let unpaidInvoices = [];
    let recentInvoices = [];
    let recentPayments = [];
    let openTickets = [];

    if (customerId) {
      allSubs = db.prepare(`
        SELECT s.id, s.number, s.status, s.start_date, s.expiry_date, s.next_billing_date,
               p.name as plan_name, p.billing_period, p.pausable, p.renewable,
               COALESCE((SELECT SUM(amount) FROM subscription_lines WHERE subscription_id = s.id), 0) as total_recurring_amount,
               COALESCE((SELECT SUM(quantity) FROM subscription_lines WHERE subscription_id = s.id), 1) as total_quantity
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        WHERE s.customer_id = ?
        ORDER BY s.id DESC
      `).all(customerId);

      activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'confirmed');

      const invoices = db.prepare(`
        SELECT i.id, i.number, i.total, i.status, i.issue_date, i.due_date,
               COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as paid_amount
        FROM invoices i
        WHERE i.customer_id = ?
        ORDER BY i.issue_date DESC
      `).all(customerId);

      recentInvoices = invoices.slice(0, 5);
      unpaidInvoices = invoices.filter(inv => {
        const remaining = Number(inv.total) - Number(inv.paid_amount);
        return (inv.status === 'confirmed' || inv.status === 'draft') && remaining > 0.01;
      });

      recentPayments = db.prepare(`
        SELECT p.id, p.amount, p.method, p.payment_date, p.note, i.number as invoice_number
        FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
        WHERE i.customer_id = ?
        ORDER BY p.payment_date DESC LIMIT 5
      `).all(customerId);

      openTickets = db.prepare(`
        SELECT id, ticket_number, subject, category, priority, status, created_at
        FROM support_tickets
        WHERE user_id = ? AND status != 'closed'
        ORDER BY created_at DESC
      `).all(user.id);
    } else if (user.role === 'admin' || user.role === 'staff') {
      // Platform-wide view for staff/admin
      allSubs = db.prepare(`
        SELECT s.id, s.number, s.status, s.start_date, s.expiry_date, s.next_billing_date,
               p.name as plan_name, p.billing_period, p.pausable, p.renewable, c.name as customer_name,
               COALESCE((SELECT SUM(amount) FROM subscription_lines WHERE subscription_id = s.id), 0) as total_recurring_amount,
               COALESCE((SELECT SUM(quantity) FROM subscription_lines WHERE subscription_id = s.id), 1) as total_quantity
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        JOIN customers c ON c.id = s.customer_id
        ORDER BY s.id DESC LIMIT 15
      `).all();
      activeSubs = allSubs.filter(s => s.status === 'active' || s.status === 'confirmed');

      const invoices = db.prepare(`
        SELECT i.id, i.number, i.total, i.status, i.issue_date, i.due_date, c.name as customer_name,
               COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as paid_amount
        FROM invoices i
        JOIN customers c ON c.id = i.customer_id
        ORDER BY i.issue_date DESC LIMIT 15
      `).all();

      recentInvoices = invoices.slice(0, 5);
      unpaidInvoices = invoices.filter(inv => {
        const remaining = Number(inv.total) - Number(inv.paid_amount);
        return (inv.status === 'confirmed' || inv.status === 'draft') && remaining > 0.01;
      });

      recentPayments = db.prepare(`
        SELECT p.id, p.amount, p.method, p.payment_date, p.note, i.number as invoice_number
        FROM payments p
        JOIN invoices i ON i.id = p.invoice_id
        ORDER BY p.payment_date DESC LIMIT 5
      `).all();

      openTickets = db.prepare(`
        SELECT id, ticket_number, subject, category, priority, status, created_at
        FROM support_tickets
        WHERE status != 'closed'
        ORDER BY created_at DESC LIMIT 5
      `).all();
    }

    const activeDiscounts = db.prepare(`
      SELECT id, code, name, type, value, min_purchase, min_quantity, scope
      FROM discounts WHERE is_active = 1
    `).all();

    // Calculate total balance due
    const totalBalanceDue = unpaidInvoices.reduce((sum, inv) => {
      const remaining = Number(inv.total) - Number(inv.paid_amount);
      return sum + Math.max(0, remaining);
    }, 0);

    let reply = '';
    let quickActions = [];
    let suggestedQuestions = [];
    let dataCard = null;

    // =========================================================================
    // INTENT RECOGNITION & REASONING
    // =========================================================================

    // 1. GREETINGS
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|howdy)\b/i.test(query)) {
      reply = `Hello **${user.name}**! 👋 Welcome to **BrightCare Customer Support**.\n\nI am your 24/7 AI customer care assistant for Brightloop. I can assist you with:\n- 📦 **Your Subscriptions & Plans** (active contracts, renewal dates, seat updates)\n- 💳 **Billing & Invoices** (checking balance, paying overdue bills, PDF downloads)\n- 🏷️ **Automated Discounts & Promotions**\n- 🔄 **Self-Service Actions** (pausing, resuming, or renewing plans)\n- 🎫 **Support Tickets & Enquiries** (submitting issues for human specialist review)\n\nWhat would you like to explore today?`;

      suggestedQuestions = [
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?',
        'When is my next billing date?',
        'How do I pause my subscription?',
        'Submit a support ticket'
      ];
      quickActions = [
        { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
        { label: '💳 View Invoices', action: 'navigate_invoices' },
        { label: '🎫 Open Support Ticket', action: 'open_ticket_modal' }
      ];
    }

    // 2. ACTIVE SUBSCRIPTIONS & PLANS LOOKUP
    else if (
      /subscription|sub|plan|contract/i.test(query) &&
      !/pause|resume|cancel|renew|close|quantity|seat/i.test(query)
    ) {
      const displaySubs = activeSubs.length > 0 ? activeSubs : allSubs;
      if (displaySubs.length > 0) {
        const subList = displaySubs.slice(0, 5).map(s =>
          `• **${s.plan_name}** (\`${s.number}\`)${s.customer_name ? ` — *Client: ${s.customer_name}*` : ''}\n  - Status: \`${s.status.toUpperCase()}\`\n  - Recurring: **$${Number(s.total_recurring_amount).toFixed(2)} / ${s.billing_period}**\n  - Seats / Units: **${s.total_quantity}**\n  - Next Billing: **${s.next_billing_date || 'N/A'}**`
        ).join('\n\n');

        if (activeSubs.length > 0) {
          reply = `You currently have **${activeSubs.length} active/confirmed subscription(s)** on file:\n\n${subList}${activeSubs.length > 5 ? `\n\n*(and ${activeSubs.length - 5} more contracts available on your portal)*` : ''}\n\nYou can update seats, pause, or renew contracts directly from your dashboard.`;
        } else {
          reply = `Here are your **${allSubs.length} subscription contract(s)** on file:\n\n${subList}${allSubs.length > 5 ? `\n\n*(and ${allSubs.length - 5} more contracts available on your portal)*` : ''}\n\nYou can activate or manage contracts directly from your dashboard.`;
        }

        dataCard = {
          type: 'subscriptions_summary',
          count: displaySubs.length,
          activeCount: activeSubs.length,
          totalMonthly: displaySubs.reduce((sum, s) => sum + Number(s.total_recurring_amount), 0),
          subscriptions: displaySubs.slice(0, 4).map(s => ({
            id: s.id,
            number: s.number,
            plan_name: s.plan_name,
            status: s.status,
            recurring_amount: Number(s.total_recurring_amount),
            billing_period: s.billing_period,
            quantity: s.total_quantity,
            next_billing_date: s.next_billing_date
          }))
        };
      } else {
        reply = `You do not have any active subscriptions right now. You have **0 contracts** on file.\n\nWould you like to browse our available recurring plans or request a quotation template?`;
      }

      suggestedQuestions = [
        'When is my next billing date?',
        'How do I adjust seat quantities?',
        'Can I pause my subscription?',
        'Do I have any unpaid invoices?'
      ];
      quickActions = [
        { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
        { label: '💳 View Invoices', action: 'navigate_invoices' },
        { label: 'View Pricing & Plans', action: 'navigate_plans' }
      ];
    }

    // 3. NEXT BILLING DATE & RECURRING CHARGES
    else if (/next bill|when.*bill|when.*charged|billing date|renewal date|due date for billing/i.test(query)) {
      if (activeSubs.length > 0) {
        const sorted = [...activeSubs].filter(s => s.next_billing_date).sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date));
        if (sorted.length > 0) {
          const earliest = sorted[0];
          reply = `📅 Your next scheduled billing event is on **${earliest.next_billing_date}** for subscription **${earliest.number}** (${earliest.plan_name}).\n\n- **Expected Amount:** $${Number(earliest.total_recurring_amount).toFixed(2)}\n- **Billing Cycle:** ${earliest.billing_period.toUpperCase()}\n- **Automated Processing:** Brightloop generates the invoice automatically on this date, applying any active eligible discounts.`;
        } else {
          reply = `Your active subscriptions do not have a pending billing date set. Contact customer care if you believe this is in error.`;
        }
      } else {
        reply = `You do not currently have any active recurring subscriptions, so no upcoming billing charges are scheduled.`;
      }

      suggestedQuestions = [
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?',
        'How does automated billing work?'
      ];
      quickActions = [
        { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
        { label: '💳 View Invoices', action: 'navigate_invoices' }
      ];
    }

    // 4. INVOICES, BALANCE, UNPAID INVOICES, OVERDUE & PAYMENTS
    else if (/invoice|balance|unpaid|owe|overdue|bill/i.test(query) && !/download.*pdf/i.test(query)) {
      if (unpaidInvoices.length > 0) {
        const invList = unpaidInvoices.slice(0, 5).map(inv => {
          const remaining = Number(inv.total) - Number(inv.paid_amount);
          return `• **${inv.number}** — **$${remaining.toFixed(2)}** (Due: ${inv.due_date}, Status: \`${inv.status.toUpperCase()}\`)${inv.customer_name ? ` [${inv.customer_name}]` : ''}`;
        }).join('\n');

        const firstUnpaid = unpaidInvoices[0];
        const firstRemaining = Number(firstUnpaid.total) - Number(firstUnpaid.paid_amount);

        reply = `⚠️ Found **${unpaidInvoices.length} outstanding invoice(s)** totaling **$${totalBalanceDue.toFixed(2)}**:\n\n${invList}${unpaidInvoices.length > 5 ? `\n\n*(and ${unpaidInvoices.length - 5} more open invoices on your portal)*` : ''}\n\nYou can pay your balance immediately online using Credit Card, Bank Wire, or PayPal with zero delay!`;

        dataCard = {
          type: 'invoices_summary',
          totalBalanceDue,
          unpaidCount: unpaidInvoices.length,
          invoices: unpaidInvoices.slice(0, 4).map(inv => ({
            id: inv.id,
            number: inv.number,
            status: inv.status,
            dueDate: inv.due_date,
            remaining: Number(inv.total) - Number(inv.paid_amount),
            total: Number(inv.total)
          }))
        };

        quickActions = [
          {
            label: `💳 Pay ${firstUnpaid.number} ($${firstRemaining.toFixed(2)})`,
            action: 'pay_invoice',
            invoiceId: firstUnpaid.id,
            invoiceNumber: firstUnpaid.number,
            amount: firstRemaining
          },
          { label: '💳 View Invoices in Portal', action: 'navigate_invoices' },
          { label: '📦 My Subscriptions', action: 'navigate_subscriptions' }
        ];
      } else if (recentInvoices.length > 0) {
        const invList = recentInvoices.map(inv =>
          `• **${inv.number}** — **$${Number(inv.total).toFixed(2)}** (Issued: ${inv.issue_date}, Status: \`${inv.status.toUpperCase()}\`)`
        ).join('\n');

        reply = `🎉 **Zero outstanding balance!** All of your invoices are settled in full ($0.00 balance due).\n\n**Recent Invoices:**\n${invList}`;

        dataCard = {
          type: 'invoices_summary',
          totalBalanceDue: 0,
          unpaidCount: 0,
          invoices: recentInvoices.slice(0, 4).map(inv => ({
            id: inv.id,
            number: inv.number,
            status: inv.status,
            dueDate: inv.due_date,
            remaining: 0,
            total: Number(inv.total)
          }))
        };

        quickActions = [
          { label: '💳 View Invoices in Portal', action: 'navigate_invoices' },
          { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
          { label: 'View Payment History', action: 'navigate_payments' }
        ];
      } else {
        reply = `No invoices are currently recorded on file. Invoices are auto-generated on recurring billing milestone dates.`;
      }

      suggestedQuestions = [
        'How do I download a PDF invoice?',
        'Show my payment history',
        'What payment methods are accepted?'
      ];
    }

    // 5. PAYMENT HISTORY & RECEIPTS
    else if (/payment history|past payment|recent payment|receipt|transaction/i.test(query)) {
      if (recentPayments.length > 0) {
        const payList = recentPayments.map(p =>
          `• **$${Number(p.amount).toFixed(2)}** via **${p.method}** on ${p.payment_date} (Ref: Invoice ${p.invoice_number})`
        ).join('\n');

        reply = `Here is your recent payment history:\n\n${payList}\n\nYou can view complete transaction records and download printable receipts on the Payment History tab.`;
      } else {
        reply = `No completed payment transactions were found on your account yet. Once you make an online invoice settlement, receipts will be listed here.`;
      }

      suggestedQuestions = [
        'Do I have any unpaid invoices?',
        'How do I pay an invoice online?',
        'Can I get a PDF receipt?'
      ];
      quickActions = [
        { label: 'Open Payment History', action: 'navigate_payments' },
        { label: 'Go to Invoices', action: 'navigate_invoices' }
      ];
    }

    // 6. HOW TO PAUSE / RESUME / RENEW SUBSCRIPTIONS
    else if (/pause|resume|freeze|hold|renew|extend/i.test(query)) {
      reply = `### 🔄 Self-Service Subscription Controls\n\nBrightloop gives you complete control over your contract lifecycle without needing to submit email requests:\n\n1. **Pausing a Subscription:**\n   - Go to **"My Subscriptions"** in your customer portal.\n   - Look for the **"Pause"** button on your active plan.\n   - When paused, recurring billing is automatically halted until you resume.\n\n2. **Resuming a Plan:**\n   - Simply click **"Resume"** on any paused plan to reinstate service.\n\n3. **Renewing Contracts:**\n   - Contracts approaching their expiry date display an instant **"Renew"** action to extend terms seamlessly.\n\n*Note: Self-service pausing is available on plans configured with the pausable permission.*`;

      suggestedQuestions = [
        'What are my active subscriptions?',
        'How do I change seat count?',
        'Submit a support ticket'
      ];
      quickActions = [
        { label: 'Go to My Subscriptions', action: 'navigate_subscriptions' }
      ];
    }

    // 7. SEAT COUNT & PRODUCT QUANTITY ADJUSTMENT
    else if (/seat|quantity|upgrade|downgrade|scale|add user|change quantity/i.test(query)) {
      reply = `### 👥 Adjusting Seats and Quantities\n\nYou can dynamically scale your product licenses and user seats at any time:\n\n1. Navigate to **"My Subscriptions"** in your portal.\n2. Click the **"Update Seats"** button on the desired subscription card.\n3. Use the **+** or **-** stepper to set the required quantity.\n4. Click **"Save Changes"**.\n\nYour recurring billing calculation will automatically adjust on the next billing date based on your new license count!`;

      suggestedQuestions = [
        'What are my active subscriptions?',
        'When is my next billing date?',
        'Talk to support team'
      ];
      quickActions = [
        { label: 'Manage Seats Now', action: 'navigate_subscriptions' }
      ];
    }

    // 8. HOW AUTOMATED DISCOUNTS WORK
    else if (/discount|coupon|promo|rule engine|voucher|save money|offer/i.test(query)) {
      const discountList = activeDiscounts.map(d =>
        `• **${d.name}** (\`${d.code}\`): ${d.type === 'percentage' ? `${d.value}% OFF` : `$${d.value} OFF`}${d.min_purchase > 0 ? ` (Min spend: $${d.min_purchase})` : ''}${d.min_quantity > 0 ? ` (Min units: ${d.min_quantity})` : ''}`
      ).join('\n');

      reply = `### 🏷️ Brightloop Automated Discount Engine\n\nBrightloop eliminates manual voucher entry by applying discounts **automatically** to your invoices whenever qualification conditions are satisfied!\n\n**Active System Promotions:**\n${discountList || '• No public discounts active currently.'}\n\n**How It Works:**\n- When your subscription invoice is generated, the discount engine evaluates your order amount, seat quantity, and product lines.\n- If your cart qualifies, the discount is deducted transparently and displayed on your invoice breakdown!`;

      suggestedQuestions = [
        'Do I have any unpaid invoices?',
        'How does automated billing work?',
        'Open a support enquiry'
      ];
      quickActions = [
        { label: 'View Automated Discounts Tab', action: 'navigate_discounts' }
      ];
    }

    // 9. HOW BILLING & BULK RUNNER WORK
    else if (/how.*billing.*work|billing cycle|recurring engine|bulk bill|simulation/i.test(query)) {
      reply = `### ⚡ How Brightloop Recurring Billing Works\n\nBrightloop is built from the ground up for strict billing integrity:\n\n1. **Billing Intervals:** Supports Daily, Weekly, Monthly, and Yearly cycles per plan.\n2. **Zero Double-Billing (INV-6):** The database enforces a unique constraint on \`(subscription_id, billing_period_start)\`, making duplicate charges mathematically impossible.\n3. **Automated Line Generation:** Pulls all contracted product variants (including variant price add-ons like Odoo +$560), applies applicable jurisdiction tax rules, and credits qualified discounts.\n4. **Simulation Button:** In your portal, you can click **"Run Billing Day ⚡"** anytime to test how the engine processes recurring milestones!`;

      suggestedQuestions = [
        'When is my next billing date?',
        'Do I have any unpaid invoices?',
        'What are my active subscriptions?'
      ];
      quickActions = [
        { label: 'Test Billing Simulation', action: 'trigger_billing_simulation' },
        { label: 'View Invoices', action: 'navigate_invoices' }
      ];
    }

    // 10. PDF INVOICE DOWNLOAD & PRINTING
    else if (/download.*pdf|print invoice|pdf copy|get invoice/i.test(query)) {
      reply = `### 📄 Downloading PDF Invoices\n\nTo download an official PDF invoice for tax or expense filing:\n\n1. Head to **"My Invoices"** in your customer portal.\n2. Click the **Download (PDF)** icon next to any invoice.\n3. Your browser will instantly generate and download a clean, formatted PDF containing company details, date, line items, taxes, discounts, and payment balance!`;

      suggestedQuestions = [
        'Do I have any unpaid invoices?',
        'What payment methods are supported?'
      ];
      quickActions = [
        { label: 'Go to My Invoices', action: 'navigate_invoices' }
      ];
    }

    // 11. PAYMENT METHODS SUPPORTED
    else if (/payment method|how to pay|credit card|wire|paypal|bank transfer/i.test(query)) {
      reply = `### 💳 Supported Payment Methods\n\nBrightloop supports multiple flexible payment options:\n\n- **Credit / Debit Cards:** Instant online settlement with cardholder verification.\n- **Bank Wire Transfer:** Record wire reference numbers for corporate settlements.\n- **PayPal:** Fast electronic checkout.\n- **Cash / Corporate Check:** Staff can record cash settlements against confirmed invoices.\n\nAll payments are matched in real-time, instantly reducing your outstanding invoice balance.`;

      suggestedQuestions = [
        'Do I have any unpaid invoices?',
        'Check my payment history'
      ];
      quickActions = [
        { label: 'View Outstanding Invoices', action: 'navigate_invoices' }
      ];
    }

    // 12. PASSWORD SECURITY POLICY & RESET
    else if (/password|reset password|forgot password|security policy/i.test(query)) {
      reply = `### 🔒 Password Policy & Reset Guidance\n\nIn accordance with specification **AUTH-3**, Brightloop enforces high-security password standards:\n\n- **Length:** Must be **more than 8 characters** (at least 9 characters).\n- **Complexity:** Must include at least **one uppercase letter**, **one lowercase letter**, and **one special character** (e.g. \`!@#$%^&*\`).\n\n**To Reset Your Password:**\nClick "Forgot Password" on the login screen. An automated simulation token is generated, allowing you to establish a secure new password immediately.`;

      suggestedQuestions = [
        'Talk to support team',
        'What are my active subscriptions?'
      ];
    }

    // 13. USER SUPPORT TICKETS LOOKUP
    else if (/my ticket|ticket status|check ticket|existing ticket|open ticket/i.test(query) && !/create|submit|new ticket/i.test(query)) {
      if (openTickets.length > 0) {
        const ticketList = openTickets.map(t =>
          `• **${t.ticket_number}** — "${t.subject}"\n  - Priority: \`${t.priority.toUpperCase()}\` | Status: \`${t.status.toUpperCase()}\` | Category: \`${t.category}\``
        ).join('\n\n');

        reply = `You currently have **${openTickets.length} active support ticket(s)**:\n\n${ticketList}\n\nOur customer care specialists are actively reviewing open inquiries.`;
      } else {
        reply = `You do not have any open support tickets right now. If you need assistance with your account, billing, or site features, feel free to submit a new enquiry!`;
      }

      suggestedQuestions = [
        'Submit a new support ticket',
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?'
      ];
      quickActions = [
        { label: 'Submit New Ticket', action: 'open_ticket_modal' },
        { label: 'Support Hub', action: 'navigate_support_tab' }
      ];
    }

    // 14. SUBMIT SUPPORT TICKET / CONTACT HUMAN SPECIALIST
    else if (/ticket|human|agent|support team|representative|helpdesk|contact support|complaint|talk to someone/i.test(query)) {
      reply = `### 🎫 Brightloop Customer Care Escalation\n\nI can help you connect with our dedicated human support engineering team right away!\n\n**Support SLA Guarantees:**\n- ⏱️ **Average First Response:** Under 2 hours\n- 🔒 **Data Privacy:** Full customer data isolation\n- 🛠️ **Categories:** Billing Inquiries, Subscription Adjustments, Technical ERP Integrations, Account Access\n\nClick **"Submit Support Ticket"** below to open an inquiry ticket. Our specialists will review your account immediately.`;

      suggestedQuestions = [
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?',
        'What are support hours?'
      ];
      quickActions = [
        { label: '📝 Submit Support Ticket', action: 'open_ticket_modal' },
        { label: 'Open Support Center', action: 'navigate_support_tab' }
      ];
    }

    // 15. DEFAULT SMART ENQUIRY FALLBACK
    else {
      reply = `Thank you for your enquiry, **${user.name}**!\n\nI searched our Brightloop knowledge base and your account records. Here is how I can best assist you:\n\n- 📦 **Subscriptions:** Ask *"What are my active subscriptions?"* or *"How do I pause my plan?"*\n- 💳 **Invoicing & Billing:** Ask *"Do I have any unpaid invoices?"* or *"When is my next billing date?"*\n- 👥 **Seat Management:** Ask *"How do I update my seats or quantity?"*\n- 🏷️ **Discounts:** Ask *"What discounts apply to me?"*\n- 🎫 **Support Escalation:** Ask *"Connect me to human customer support"* to open a prioritized ticket.\n\nFeel free to choose a quick topic below or type your specific question!`;

      suggestedQuestions = [
        'What are my active subscriptions?',
        'Do I have any unpaid invoices?',
        'When is my next billing date?',
        'How do I pause or renew my plan?',
        'Submit a support ticket'
      ];
      quickActions = [
        { label: '📦 My Subscriptions', action: 'navigate_subscriptions' },
        { label: '💳 My Invoices', action: 'navigate_invoices' },
        { label: '🎫 Open Support Ticket', action: 'open_ticket_modal' }
      ];
    }

    return res.json({
      reply,
      quickActions,
      suggestedQuestions,
      dataCard,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Chatbot endpoint error:', err);
    return res.status(500).json({
      error: 'Support chatbot error',
      message: err.message
    });
  }
});

// ---------------------------------------------------------------------------
// 2. SUPPORT TICKETS ENDPOINTS (GET & POST /api/support/tickets)
// ---------------------------------------------------------------------------
router.get('/tickets', authenticate, (req, res) => {
  try {
    const user = req.user;
    let tickets = [];

    if (user.role === 'customer') {
      tickets = db.prepare(`
        SELECT t.*,
               (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
               (SELECT message FROM support_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_message,
               (SELECT created_at FROM support_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_message_at
        FROM support_tickets t
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC
      `).all(user.id);
    } else {
      // Admin / Staff can see all tickets
      tickets = db.prepare(`
        SELECT t.*,
               (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
               (SELECT message FROM support_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_message,
               (SELECT created_at FROM support_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_message_at
        FROM support_tickets t
        ORDER BY
          CASE t.status
            WHEN 'open' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'resolved' THEN 3
            WHEN 'closed' THEN 4
            ELSE 5
          END,
          t.created_at DESC
      `).all();
    }

    res.json({ tickets });
  } catch (err) {
    console.error('Failed to fetch tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets', message: err.message });
  }
});

router.post('/tickets', authenticate, (req, res) => {
  try {
    const { subject, category = 'enquiry', priority = 'normal', message } = req.body;
    const user = req.user;
    const customer = req.customer;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Initial message or enquiry details are required' });
    }

    const ticketNumber = generateTicketNumber();
    const customerId = (customer && customer.id) ? Number(customer.id) : null;
    const customerName = (customer && customer.name) ? String(customer.name) : String(user.name || 'Customer');
    const customerEmail = String(user.email || (customer && customer.email) || 'customer@brightloop.com');

    const result = db.prepare(`
      INSERT INTO support_tickets (ticket_number, user_id, customer_id, customer_name, customer_email, subject, category, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      ticketNumber,
      Number(user.id),
      customerId,
      customerName,
      customerEmail,
      String(subject.trim()),
      String(category),
      String(priority)
    );

    const ticketId = Number(result.lastInsertRowid);

    // Insert first message
    db.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
      VALUES (?, ?, 'customer', ?, ?)
    `).run(
      ticketId,
      user.id,
      user.name,
      message.trim()
    );

    // Auto-reply confirmation from Brightbot
    db.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
      VALUES (?, NULL, 'bot', 'BrightCare AI', ?)
    `).run(
      ticketId,
      `Hello ${user.name}! Your support ticket **${ticketNumber}** has been received and prioritized (${priority.toUpperCase()}). A customer care engineer has been notified and will reply shortly.`
    );

    // Log activity
    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES ('ticket_created', ?, ?, ?, 'support_ticket', ?)
    `).run(
      `Support Ticket ${ticketNumber} created`,
      `Subject: "${subject.trim()}" | Category: ${category} | Priority: ${priority}`,
      ticketId,
      user.name
    );

    const createdTicket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
    res.status(201).json({
      success: true,
      ticket: createdTicket,
      message: `Support ticket ${ticketNumber} submitted successfully!`
    });
  } catch (err) {
    console.error('Failed to create ticket:', err);
    res.status(500).json({ error: 'Failed to create support ticket', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. TICKET DETAIL & MESSAGES (GET, POST /api/support/tickets/:id)
// ---------------------------------------------------------------------------
router.get('/tickets/:id', authenticate, (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const user = req.user;

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Role check: customer can only view own ticket
    if (user.role === 'customer' && ticket.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    const messages = db.prepare(`
      SELECT * FROM support_messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC
    `).all(ticketId);

    res.json({ ticket, messages });
  } catch (err) {
    console.error('Failed to get ticket details:', err);
    res.status(500).json({ error: 'Failed to get ticket details', message: err.message });
  }
});

router.post('/tickets/:id/messages', authenticate, (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { message } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    if (user.role === 'customer' && ticket.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    const senderType = user.role === 'customer' ? 'customer' : 'agent';
    const senderName = user.role === 'customer' ? user.name : `${user.name} (Support Staff)`;

    const msgRes = db.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      ticketId,
      user.id,
      senderType,
      senderName,
      message.trim()
    );

    // Update ticket updated_at and status
    let newStatus = ticket.status;
    if (senderType === 'agent' && ticket.status === 'open') {
      newStatus = 'in_progress';
    } else if (senderType === 'customer' && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      newStatus = 'open'; // reopen if customer replies
    }

    db.prepare(`
      UPDATE support_tickets
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, ticketId);

    const insertedMsg = db.prepare('SELECT * FROM support_messages WHERE id = ?').get(Number(msgRes.lastInsertRowid));
    res.json({ success: true, message: insertedMsg, newStatus });
  } catch (err) {
    console.error('Failed to add message to ticket:', err);
    res.status(500).json({ error: 'Failed to add message', message: err.message });
  }
});

router.patch('/tickets/:id', authenticate, (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { status, priority } = req.body;
    const user = req.user;

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Only admin/staff or ticket owner can change status
    if (user.role === 'customer' && ticket.user_id !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    const newStatus = validStatuses.includes(status) ? status : ticket.status;
    const newPriority = validPriorities.includes(priority) ? priority : ticket.priority;

    db.prepare(`
      UPDATE support_tickets
      SET status = ?, priority = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, newPriority, ticketId);

    const updated = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
    res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Failed to update ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. KNOWLEDGE BASE & FAQS (GET /api/support/faqs)
// ---------------------------------------------------------------------------
router.get('/faqs', authenticate, (req, res) => {
  try {
    const faqs = db.prepare('SELECT * FROM support_faqs ORDER BY category ASC, helpful_count DESC').all();

    // Group by category
    const grouped = faqs.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ faqs, grouped });
  } catch (err) {
    console.error('Failed to fetch FAQs:', err);
    res.status(500).json({ error: 'Failed to fetch FAQs', message: err.message });
  }
});

router.post('/faqs/:id/helpful', authenticate, (req, res) => {
  try {
    const faqId = Number(req.params.id);
    db.prepare('UPDATE support_faqs SET helpful_count = helpful_count + 1 WHERE id = ?').run(faqId);
    const updated = db.prepare('SELECT * FROM support_faqs WHERE id = ?').get(faqId);
    res.json({ success: true, faq: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to increment helpful counter' });
  }
});

export default router;
