import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateInvoiceForSubscription } from '../services/billingService.js';

const router = express.Router();

// List invoices (Customer sees only own, Team sees all)
router.get('/', authenticate, (req, res) => {
  const { status, customer_id, overdue_only, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT i.*,
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           s.number as subscription_number,
           (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE 1=1
  `;
  const params = [];

  // Customer portal access restriction
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) return res.json({ invoices: [], total: 0 });
    query += ' AND i.customer_id = ?';
    params.push(cust.id);
  } else if (customer_id) {
    query += ' AND i.customer_id = ?';
    params.push(customer_id);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  const today = new Date().toISOString().split('T')[0];

  if (overdue_only === 'true') {
    // Overdue condition: confirmed, not cancelled, past due_date, and outstanding balance > 0
    query += ` AND i.status = 'confirmed' AND i.due_date < ?
               AND (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) < i.total`;
    params.push(today);
  }

  if (search) {
    query += ' AND (i.number LIKE ? OR c.name LIKE ? OR c.company LIKE ? OR s.number LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? countRow.total : 0;

  query += ' ORDER BY i.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 100, Number(offset) || 0);

  const rawInvoices = db.prepare(query).all(...params);

  const invoices = rawInvoices.map(inv => {
    const paid = Number(inv.paid_amount || 0);
    const outstanding = Math.max(0, Number((inv.total - paid).toFixed(2)));
    const isOverdue = inv.status === 'confirmed' && inv.due_date < today && outstanding > 0;
    return {
      ...inv,
      paid_amount: paid,
      outstanding,
      is_overdue: isOverdue
    };
  });

  res.json({ invoices, total });
});

// Get single invoice details
router.get('/:id', authenticate, (req, res) => {
  const inv = db.prepare(`
    SELECT i.*,
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           c.phone as customer_phone, c.billing_address as customer_address,
           s.number as subscription_number, s.payment_terms
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  // Customer authorization check
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== inv.customer_id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own invoices.' });
    }
  }

  const lines = db.prepare(`
    SELECT il.*, pr.name as product_name, pv.value as variant_value
    FROM invoice_lines il
    JOIN products pr ON il.product_id = pr.id
    LEFT JOIN product_variants pv ON il.variant_id = pv.id
    WHERE il.invoice_id = ?
    ORDER BY il.id ASC
  `).all(inv.id);

  const payments = db.prepare(`
    SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC
  `).all(inv.id);

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, Number((inv.total - paidAmount).toFixed(2)));
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = inv.status === 'confirmed' && inv.due_date < today && outstanding > 0;

  res.json({
    invoice: {
      ...inv,
      lines,
      payments,
      paid_amount: paidAmount,
      outstanding,
      is_overdue: isOverdue
    }
  });
});

// INV-1: Manually trigger invoice generation for a subscription
router.post('/generate/:subscriptionId', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { billingDate, billingPeriodStart, initialStatus } = req.body;
  try {
    const result = generateInvoiceForSubscription(req.params.subscriptionId, {
      billingDate: billingDate || new Date().toISOString().split('T')[0],
      billingPeriodStart: billingPeriodStart || billingDate || null,
      initialStatus: initialStatus || 'draft',
      issuedBy: req.user.name
    });

    if (result.skipped) {
      return res.status(200).json({
        message: result.reason,
        skipped: true,
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber
      });
    }

    res.status(201).json({
      message: `Invoice ${result.invoiceNumber} created successfully.`,
      ...result
    });
  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(400).json({ error: err.message });
  }
});

// INV-4 & INV-5: Status transitions (Confirm, Cancel, Send)
router.post('/:id/action', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { action } = req.body; // 'confirm', 'cancel', 'send'
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);

  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }

  let updatedStatus = inv.status;
  let sentAt = inv.sent_at;

  switch (action) {
    case 'confirm':
      if (inv.status !== 'draft') {
        return res.status(400).json({ error: `Cannot confirm invoice with status '${inv.status}'.` });
      }
      updatedStatus = 'confirmed';
      break;

    case 'cancel':
      if (inv.status === 'paid') {
        return res.status(400).json({ error: 'Cannot cancel an invoice that has already been paid.' });
      }
      updatedStatus = 'cancelled';
      break;

    case 'send':
      sentAt = new Date().toISOString();
      if (inv.status === 'draft') {
        updatedStatus = 'confirmed'; // Sending automatically moves to Confirmed
      }
      const customer = db.prepare('SELECT email, name FROM customers WHERE id = ?').get(inv.customer_id);
      db.prepare(`
        INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'invoice_sent',
        `Invoice ${inv.number} Sent`,
        `Invoice for $${inv.total.toFixed(2)} sent to ${customer ? customer.email : 'customer'}`,
        inv.id,
        'invoice',
        req.user.name
      );
      break;

    default:
      return res.status(400).json({ error: `Unknown action '${action}'.` });
  }

  db.prepare(`
    UPDATE invoices
    SET status = ?, sent_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(updatedStatus, sentAt, inv.id);

  res.json({
    message: `Invoice ${inv.number} ${action}ed successfully.`,
    status: updatedStatus,
    sent_at: sentAt
  });
});

export default router;
