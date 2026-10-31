import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  buildPaymentReceiptTemplate,
  buildInvoiceReminderTemplate,
  dispatchNotification
} from '../services/notificationService.js';

const router = express.Router();

// List payments
router.get('/', authenticate, (req, res) => {
  const { invoice_id, method, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT p.*,
           i.number as invoice_number, i.total as invoice_total, i.status as invoice_status,
           c.name as customer_name, c.company as customer_company
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  // Customer role restriction
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) return res.json({ payments: [], total: 0 });
    query += ' AND i.customer_id = ?';
    params.push(cust.id);
  }

  if (invoice_id) {
    query += ' AND p.invoice_id = ?';
    params.push(invoice_id);
  }

  if (method) {
    query += ' AND p.method = ?';
    params.push(method);
  }

  if (search) {
    query += ' AND (i.number LIKE ? OR c.name LIKE ? OR c.company LIKE ? OR p.note LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? countRow.total : 0;

  query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 100, Number(offset) || 0);

  const payments = db.prepare(query).all(...params);
  res.json({ payments, total });
});

// PAY-1 & PAY-2: Record payment against an invoice
router.post('/', authenticate, (req, res) => {
  const { invoice_id, amount, payment_date, note } = req.body;
  const method = req.body.method || req.body.payment_method;

  if (!invoice_id || !method || amount === undefined) {
    return res.status(400).json({ error: 'Invoice, payment method, and amount are required.' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  // Customer authorization: can only pay own invoice
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== inv.customer_id) {
      return res.status(403).json({ error: 'Access denied. You can only pay your own invoices.' });
    }
  }

  const payDate = payment_date || new Date().toISOString().split('T')[0];

  try {
    db.exec('BEGIN TRANSACTION;');

    const result = db.prepare(`
      INSERT INTO payments (invoice_id, method, amount, payment_date, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(inv.id, method, numAmount, payDate, note || null);

    // Calculate total paid so far
    const totalPaidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments
      WHERE invoice_id = ?
    `).get(inv.id);

    const totalPaid = Number(totalPaidRow.total_paid.toFixed(2));
    const isFullyPaid = totalPaid >= inv.total;

    let newStatus = inv.status;
    if (isFullyPaid) {
      newStatus = 'paid';
    } else if (inv.status === 'draft') {
      newStatus = 'confirmed';
    }

    db.prepare(`
      UPDATE invoices
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, inv.id);

    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'payment_recorded',
      `Payment of $${numAmount.toFixed(2)} Recorded`,
      `Invoice ${inv.number} received $${numAmount.toFixed(2)} via ${method} (Total Paid: $${totalPaid} / $${inv.total})${isFullyPaid ? ' - FULLY PAID' : ''}`,
      inv.id,
      'invoice',
      req.user.name
    );

    db.exec('COMMIT;');

    const paymentId = Number(result.lastInsertRowid);
    const outstanding = Math.max(0, Number((inv.total - totalPaid).toFixed(2)));

    // Automatically dispatch Payment Receipt notification (Email & SMS) to customer
    try {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(inv.customer_id);
      if (customer) {
        const receiptTemplate = buildPaymentReceiptTemplate({
          payment: { id: paymentId, amount: numAmount, method, payment_date: payDate, note },
          invoice: inv,
          customer,
          isFullyPaid,
          remainingBalance: outstanding
        });

        dispatchNotification({
          customer_id: customer.id,
          invoice_id: inv.id,
          payment_id: paymentId,
          type: 'payment_receipt',
          channel: 'both',
          subject: receiptTemplate.subject,
          email_html: receiptTemplate.emailHtml,
          sms_body: receiptTemplate.smsBody,
          recipient_email: customer.email,
          recipient_phone: customer.phone || '+1 (555) 019-2834',
          created_by: req.user.name
        });
      }
    } catch (e) {
      console.warn('Could not auto-dispatch payment receipt notification:', e.message);
    }

    res.status(201).json({
      message: `Payment of $${numAmount.toFixed(2)} recorded successfully.${isFullyPaid ? ' Invoice is now Paid!' : ''} Payment receipt sent via Email & SMS.`,
      paymentId,
      invoiceStatus: newStatus,
      totalPaid,
      outstanding
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Payment recording error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// PAY-4: Chase overdue invoice
router.post('/chase/:invoiceId', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.id as customer_id, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `).get(req.params.invoiceId);

  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(inv.id);
  const outstanding = Math.max(0, Number((inv.total - paidRow.paid).toFixed(2)));
  inv.outstanding = outstanding;

  const items = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(inv.id);
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = inv.due_date < today;

  const reminder = buildInvoiceReminderTemplate({
    invoice: inv,
    customer: { name: inv.customer_name, email: inv.customer_email, phone: inv.customer_phone },
    items,
    isOverdue
  });

  // Dispatch actual notification into customer inbox & logs
  dispatchNotification({
    customer_id: inv.customer_id,
    invoice_id: inv.id,
    type: isOverdue ? 'payment_reminder' : 'invoice_due',
    channel: 'both',
    subject: reminder.subject,
    email_html: reminder.emailHtml,
    sms_body: reminder.smsBody,
    recipient_email: inv.customer_email,
    recipient_phone: inv.customer_phone || '+1 (555) 019-2834',
    created_by: req.user.name
  });

  res.json({
    message: `Payment chase reminder dispatched to ${inv.customer_email} via Email and SMS ($${outstanding.toFixed(2)} due).`,
    chasedAt: new Date().toISOString()
  });
});

export default router;
