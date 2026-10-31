import { db } from './database.js';

export function seedSupportData() {
  // Check if FAQs already seeded
  const faqCount = db.prepare('SELECT COUNT(*) as count FROM support_faqs').get();
  if (faqCount.count === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO support_faqs (category, question, answer, tags, helpful_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const faqs = [
      {
        category: 'Billing & Recurring Invoices',
        question: 'How does automated recurring billing work?',
        answer: 'Brightloop runs an automated idempotent billing engine. At the beginning of each billing interval (daily, weekly, monthly, or yearly according to your plan), invoices are auto-generated with your active product line items, jurisdiction tax rates, and active discount rules applied. Nothing is ever double-billed.',
        tags: 'billing, cycle, automatic, invoice, recurring',
        helpful_count: 42
      },
      {
        category: 'Billing & Recurring Invoices',
        question: 'How do I view and pay my outstanding invoices?',
        answer: 'Go to "My Invoices" in your Customer Portal. Click "Pay Now" on any open or confirmed invoice. You can pay securely with Credit Card, Bank Wire, PayPal, or Cash reference.',
        tags: 'payment, pay, invoice, outstanding, credit card',
        helpful_count: 38
      },
      {
        category: 'Billing & Recurring Invoices',
        question: 'Can I download an official PDF copy of my invoice?',
        answer: 'Yes! Inside "My Invoices", click the "Download PDF" icon on any invoice row. A complete, tax-compliant PDF invoice with company details, line items, and payment breakdown will download instantly.',
        tags: 'invoice, pdf, download, receipt, tax',
        helpful_count: 55
      },
      {
        category: 'Billing & Recurring Invoices',
        question: 'What happens if my invoice is marked Overdue?',
        answer: 'An invoice becomes overdue when the current date passes its payment terms due date. You can pay it immediately in the portal without penalty during the standard grace period.',
        tags: 'overdue, unpaid, late, reminder, payment',
        helpful_count: 19
      },
      {
        category: 'Subscriptions & Plans',
        question: 'How do I pause or resume my subscription?',
        answer: 'If your plan permits pausing (PLAN-4 pausable flag enabled), you will see a "Pause" button on your subscription card in "My Subscriptions". Clicking it halts recurring billing until you click "Resume".',
        tags: 'pause, resume, subscription, hold, freeze',
        helpful_count: 64
      },
      {
        category: 'Subscriptions & Plans',
        question: 'How do I add or adjust team seats / product quantities?',
        answer: 'Navigate to "My Subscriptions" and select "Update Seats". Adjust the seat count up or down (must meet the plan minimum quantity) and save. Your recurring investment updates dynamically.',
        tags: 'seats, quantity, upgrade, add seats, scale',
        helpful_count: 51
      },
      {
        category: 'Subscriptions & Plans',
        question: 'What is the subscription lifecycle flow?',
        answer: 'Contracts transition through: Draft → Quotation → Confirmed → Active → Closed (or Paused). Customers can review active terms, request pauses, and trigger 1-click renewals from the self-service portal.',
        tags: 'lifecycle, states, draft, quotation, active, renew',
        helpful_count: 27
      },
      {
        category: 'Discounts & Rules',
        question: 'How does the automated discount rule engine work?',
        answer: 'Brightloop automated discount rules apply percentage or fixed deductions. The rule engine validates minimum spend, minimum seat thresholds, date windows, and global usage caps before automatically applying discounts to your invoice.',
        tags: 'discount, promo, coupon, percentage, rule engine',
        helpful_count: 33
      },
      {
        category: 'Security & Access',
        question: 'What are the password security requirements?',
        answer: 'In compliance with AUTH-3, passwords must be at least 9 characters long, and contain at least one uppercase letter, one lowercase letter, and one special character (such as !@#$%^&*).',
        tags: 'password, security, policy, complexity, reset',
        helpful_count: 40
      },
      {
        category: 'Customer Care & SLA',
        question: 'How do I reach a human customer support representative?',
        answer: 'You can submit a support enquiry ticket directly through this chatbot or the "Support & Enquiries" tab. Our dedicated support engineering team operates Mon-Fri 8am-8pm EST with a sub-2-hour SLA response guarantee.',
        tags: 'support, help, contact, ticket, human, representative, agent',
        helpful_count: 88
      }
    ];

    for (const faq of faqs) {
      insertFaq.run(faq.category, faq.question, faq.answer, faq.tags, faq.helpful_count);
    }
  }

  // Check if sample tickets exist
  const ticketCount = db.prepare('SELECT COUNT(*) as count FROM support_tickets').get();
  if (ticketCount.count === 0) {
    const cust1 = db.prepare("SELECT u.id as user_id, c.id as customer_id, c.name, c.email FROM users u JOIN customers c ON c.user_id = u.id WHERE u.email = 'customer@acmecorp.com'").get();
    const cust2 = db.prepare("SELECT u.id as user_id, c.id as customer_id, c.name, c.email FROM users u JOIN customers c ON c.user_id = u.id WHERE u.email = 'sarah@retailflow.io'").get();

    if (cust1) {
      const res1 = db.prepare(`
        INSERT INTO support_tickets (ticket_number, user_id, customer_id, customer_name, customer_email, subject, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'TICK-2026-0101',
        cust1.user_id,
        cust1.customer_id,
        cust1.name,
        cust1.email,
        'Question regarding Odoo ERP connector setup & sync frequency',
        'technical',
        'normal',
        'resolved'
      );

      const ticketId = Number(res1.lastInsertRowid);
      db.prepare(`
        INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        ticketId,
        cust1.user_id,
        'customer',
        cust1.name,
        'Hi BrightCare support team, what is the sync frequency for the Odoo Integration Connector variant on our CRM plan?'
      );

      db.prepare(`
        INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        ticketId,
        null,
        'agent',
        'Marcus Vance (Support Staff)',
        'Hello Alex! The Odoo connector syncs in real-time on webhook events with an automated fallback sync every 15 minutes. Everything is currently active on your contract!'
      );

      // Open ticket for Alex
      const res2 = db.prepare(`
        INSERT INTO support_tickets (ticket_number, user_id, customer_id, customer_name, customer_email, subject, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'TICK-2026-0104',
        cust1.user_id,
        cust1.customer_id,
        cust1.name,
        cust1.email,
        'Invoice tax breakdown inquiry for quarterly expense filing',
        'billing',
        'normal',
        'open'
      );
      db.prepare(`
        INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Number(res2.lastInsertRowid),
        cust1.user_id,
        'customer',
        cust1.name,
        'Could you verify the jurisdiction VAT rule applied on invoice INV-2026-0001? We are preparing our quarterly filing.'
      );
    }

    if (cust2) {
      const res3 = db.prepare(`
        INSERT INTO support_tickets (ticket_number, user_id, customer_id, customer_name, customer_email, subject, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'TICK-2026-0102',
        cust2.user_id,
        cust2.customer_id,
        cust2.name,
        cust2.email,
        'Assistance with seat volume increase on Enterprise Analytics',
        'subscription',
        'high',
        'in_progress'
      );

      db.prepare(`
        INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Number(res3.lastInsertRowid),
        cust2.user_id,
        'customer',
        cust2.name,
        'We are onboarding 15 new sales reps next month and want to scale our Analytics seats smoothly.'
      );

      db.prepare(`
        INSERT INTO support_messages (ticket_id, user_id, sender_type, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        Number(res3.lastInsertRowid),
        null,
        'agent',
        'Sarah Jenkins (Admin)',
        'Hi Sarah, you can scale seats directly using the self-service "Update Seats" button in your portal, or we can configure a custom quotation template package for you!'
      );
    }
  }
}
