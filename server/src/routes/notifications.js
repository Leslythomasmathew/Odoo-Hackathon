import express from 'express';
import nodemailer from 'nodemailer';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  buildInvoiceReminderTemplate,
  buildPaymentReceiptTemplate,
  dispatchNotification,
  getAllSettings,
  setSetting,
  sendRealEmail,
  checkAndSendAutomatedDueReminders
} from '../services/notificationService.js';

const router = express.Router();

/**
 * List customer notifications
 */
router.get('/', authenticate, (req, res) => {
  const { customer_id, invoice_id, type, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT n.*,
           c.name as customer_name, c.company as customer_company,
           i.number as invoice_number, i.total as invoice_total
    FROM customer_notifications n
    JOIN customers c ON n.customer_id = c.id
    LEFT JOIN invoices i ON n.invoice_id = i.id
    WHERE 1=1
  `;
  const params = [];

  // Customer authorization: customers only see their own notifications
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) return res.json({ notifications: [], total: 0, unread_count: 0 });
    query += ' AND n.customer_id = ?';
    params.push(cust.id);
  } else if (customer_id) {
    query += ' AND n.customer_id = ?';
    params.push(customer_id);
  }

  if (invoice_id) {
    query += ' AND n.invoice_id = ?';
    params.push(invoice_id);
  }

  if (type) {
    query += ' AND n.type = ?';
    params.push(type);
  }

  const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? countRow.total : 0;

  // Unread count
  let unreadQuery = `SELECT COUNT(*) as unread FROM customer_notifications WHERE status != 'read'`;
  const unreadParams = [];
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (cust) {
      unreadQuery += ' AND customer_id = ?';
      unreadParams.push(cust.id);
    }
  }
  const unreadRow = db.prepare(unreadQuery).get(...unreadParams);
  const unreadCount = unreadRow ? unreadRow.unread : 0;

  query += ' ORDER BY n.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 50, Number(offset) || 0);

  const notifications = db.prepare(query).all(...params);
  res.json({ notifications, total, unread_count: unreadCount });
});

/**
 * Get single notification detail
 */
router.get('/:id', authenticate, (req, res) => {
  const notif = db.prepare(`
    SELECT n.*,
           c.name as customer_name, c.company as customer_company,
           i.number as invoice_number, i.total as invoice_total
    FROM customer_notifications n
    JOIN customers c ON n.customer_id = c.id
    LEFT JOIN invoices i ON n.invoice_id = i.id
    WHERE n.id = ?
  `).get(req.params.id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== notif.customer_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
  }

  res.json({ notification: notif });
});

/**
 * Preview notification template before sending
 */
router.post('/preview', authenticate, (req, res) => {
  const { invoice_id, type = 'invoice_due' } = req.body;

  if (!invoice_id) {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
  const items = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(invoice.id);

  // Calculate outstanding
  const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(invoice.id);
  const totalPaid = Number(paidRow.paid || 0);
  const outstanding = Math.max(0, Number((invoice.total - totalPaid).toFixed(2)));
  invoice.outstanding = outstanding;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = invoice.due_date < today && invoice.status !== 'paid';

  let preview;
  if (type === 'payment_receipt') {
    const lastPayment = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC LIMIT 1').get(invoice.id);
    if (!lastPayment) {
      return res.status(400).json({ error: 'No payment recorded for this invoice yet.' });
    }
    preview = buildPaymentReceiptTemplate({
      payment: lastPayment,
      invoice,
      customer,
      isFullyPaid: outstanding === 0,
      remainingBalance: outstanding
    });
  } else {
    preview = buildInvoiceReminderTemplate({
      invoice,
      customer,
      items,
      isOverdue
    });
  }

  res.json({
    recipient_email: customer.email,
    recipient_phone: customer.phone || '+1 (555) 019-2834',
    customer_name: customer.name,
    customer_company: customer.company,
    ...preview
  });
});

/**
 * Dispatch notification (Email)
 */
router.post('/send', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { invoice_id, type = 'invoice_due', custom_subject } = req.body;

  if (!invoice_id) {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id);
  const items = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(invoice.id);

  const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(invoice.id);
  const totalPaid = Number(paidRow.paid || 0);
  const outstanding = Math.max(0, Number((invoice.total - totalPaid).toFixed(2)));
  invoice.outstanding = outstanding;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = invoice.due_date < today && invoice.status !== 'paid';

  let generated;
  if (type === 'payment_receipt') {
    const lastPayment = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC LIMIT 1').get(invoice.id);
    if (!lastPayment) {
      return res.status(400).json({ error: 'No payment recorded for this invoice yet.' });
    }
    generated = buildPaymentReceiptTemplate({
      payment: lastPayment,
      invoice,
      customer,
      isFullyPaid: outstanding === 0,
      remainingBalance: outstanding
    });
  } else {
    generated = buildInvoiceReminderTemplate({
      invoice,
      customer,
      items,
      isOverdue
    });
  }

  const notif = dispatchNotification({
    customer_id: customer.id,
    invoice_id: invoice.id,
    type,
    channel: 'email',
    subject: custom_subject || generated.subject,
    email_html: generated.emailHtml,
    recipient_email: customer.email,
    recipient_phone: customer.phone,
    created_by: req.user.name
  });

  res.status(201).json({
    message: `Notification successfully sent to ${customer.email} via Email`,
    notification: notif
  });
});

/**
 * Mark notification as read
 */
router.patch('/:id/read', authenticate, (req, res) => {
  const notif = db.prepare('SELECT * FROM customer_notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== notif.customer_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
  }

  db.prepare(`
    UPDATE customer_notifications
    SET status = 'read', read_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ success: true });
});

/**
 * Bulk remind all customers with invoices due or overdue
 */
router.post('/remind-all-due', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Find open invoices
  const openInvoices = db.prepare(`
    SELECT i.*, c.email as customer_email, c.phone as customer_phone, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.status != 'paid' AND i.status != 'cancelled'
  `).all();

  const dispatched = [];

  for (const inv of openInvoices) {
    const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(inv.id);
    const outstanding = Math.max(0, Number((inv.total - Number(paidRow.paid || 0)).toFixed(2)));
    if (outstanding <= 0) continue;

    inv.outstanding = outstanding;
    const isOverdue = inv.due_date < today;

    const items = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(inv.id);
    const cust = { name: inv.customer_name, email: inv.customer_email, phone: inv.customer_phone };

    const generated = buildInvoiceReminderTemplate({
      invoice: inv,
      customer: cust,
      items,
      isOverdue
    });

    const notif = dispatchNotification({
      customer_id: inv.customer_id,
      invoice_id: inv.id,
      type: isOverdue ? 'payment_reminder' : 'invoice_due',
      channel: 'email',
      subject: generated.subject,
      email_html: generated.emailHtml,
      recipient_email: cust.email,
      recipient_phone: cust.phone,
      created_by: `${req.user.name} (Bulk Chaser)`
    });

    dispatched.push({
      invoice_number: inv.number,
      customer_name: inv.customer_name,
      amount: outstanding,
      notification_id: notif.id
    });
  }

  res.json({
    count: dispatched.length,
    message: `Dispatched payment reminders for ${dispatched.length} open invoices via Email.`,
    dispatched
  });
});

/**
 * Trigger automated due date reminder scanner
 */
router.post('/run-due-scheduler', authenticate, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const result = await checkAndSendAutomatedDueReminders();
    res.json({
      message: `Automated Due Scheduler processed: ${result.count} reminders sent.`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get communication gateway settings
 */
router.get('/settings/config', authenticate, requireRole(['admin']), (req, res) => {
  const settings = getAllSettings();
  res.json({
    settings: {
      ...settings,
      SMTP_PASS: settings.SMTP_PASS ? '********' : ''
    }
  });
});

/**
 * Save communication gateway settings
 */
router.post('/settings/config', authenticate, requireRole(['admin']), (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  for (const [key, val] of Object.entries(settings)) {
    if (val !== undefined && val !== '********') {
      setSetting(key, val);
    }
  }

  res.json({ message: 'Email gateway settings saved successfully!' });
});

/**
 * Auto-generate instant test SMTP mailbox (Ethereal)
 */
router.post('/settings/auto-test-account', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    setSetting('SMTP_HOST', testAccount.smtp.host);
    setSetting('SMTP_PORT', String(testAccount.smtp.port));
    setSetting('SMTP_SECURE', String(testAccount.smtp.secure));
    setSetting('SMTP_USER', testAccount.user);
    setSetting('SMTP_PASS', testAccount.pass);
    setSetting('EMAIL_FROM', `Brightloop Billing <${testAccount.user}>`);

    res.json({
      message: 'Instant live test email mailbox generated & connected!',
      account: {
        host: testAccount.smtp.host,
        port: String(testAccount.smtp.port),
        secure: String(testAccount.smtp.secure),
        user: testAccount.user,
        pass: testAccount.pass,
        webUrl: 'https://ethereal.email/login'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate test mailbox: ' + err.message });
  }
});

/**
 * Send real test email
 */
router.post('/test-email', authenticate, requireRole(['admin', 'staff']), async (req, res) => {
  const { to, subject, message } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient email is required.' });

  const testSubject = subject || 'Brightloop Real Email Test - Live Gateway Connected';
  const testHtml = `
    <div style="font-family: -apple-system, sans-serif; padding: 28px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 550px;">
      <div style="background: #4338ca; color: white; padding: 12px 20px; border-radius: 8px; font-weight: bold; margin-bottom: 20px;">
        Brightloop Live Email Gateway
      </div>
      <h2 style="color: #1e1b4b; margin-top: 0;">Live Email Verification Succeeded!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Congratulations! Your live email delivery integration is operational and connected.
      </p>
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
        <div><strong>Recipient:</strong> ${to}</div>
        <div><strong>Dispatched At:</strong> ${new Date().toLocaleString()}</div>
        <div><strong>Status:</strong> Delivered Directly to Inbox</div>
      </div>
      <p style="color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        ${message || 'This verifies that Brightloop can deliver subscription confirmations, due reminders, and payment receipts directly to real user inboxes.'}
      </p>
    </div>
  `;

  const result = await sendRealEmail({ to, subject: testSubject, html: testHtml });
  if (result.success && result.delivered) {
    res.json({
      message: `Real email successfully delivered directly to ${to}! Message ID: ${result.messageId}`,
      previewUrl: result.previewUrl
    });
  } else if (!result.delivered && result.notice) {
    res.status(400).json({ error: result.notice });
  } else {
    res.status(500).json({ error: result.error || 'Failed to dispatch test email.' });
  }
});

export default router;
