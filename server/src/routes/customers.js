import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List customers with financial & subscription summary
router.get('/', authenticate, (req, res) => {
  // If customer role, only return self
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(req.user.id);
    return res.json({ customers: cust ? [cust] : [] });
  }

  // Admin and Staff can see all customers
  const customers = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM subscriptions s WHERE s.customer_id = c.id AND s.status = 'active') as active_subscriptions_count,
      (SELECT COALESCE(SUM(i.total), 0) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'cancelled') as total_invoiced,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.customer_id = c.id) as total_paid
    FROM customers c
    ORDER BY c.name ASC
  `).all();

  const enriched = customers.map(c => ({
    ...c,
    total_outstanding: Math.max(0, Number((c.total_invoiced - c.total_paid).toFixed(2)))
  }));

  res.json({ customers: enriched });
});

// Get single customer details
router.get('/:id', authenticate, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Authorization check for customer role
  if (req.user.role === 'customer') {
    const linked = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!linked || linked.id !== customer.id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own account.' });
    }
  }

  const subscriptions = db.prepare(`
    SELECT s.*, p.name as plan_name, p.billing_period
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.customer_id = ?
    ORDER BY s.id DESC
  `).all(customer.id);

  const invoices = db.prepare(`
    SELECT i.*,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
    FROM invoices i
    WHERE i.customer_id = ?
    ORDER BY i.id DESC
  `).all(customer.id);

  res.json({
    customer: {
      ...customer,
      subscriptions,
      invoices: invoices.map(inv => ({
        ...inv,
        outstanding: Math.max(0, Number((inv.total - inv.paid_amount).toFixed(2)))
      }))
    }
  });
});

// Admin and staff can create customer
router.post('/', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { name, email, phone, company, billing_address } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'A customer with this email already exists.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, company, billing_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), email.trim().toLowerCase(), phone || null, company || null, billing_address || null);

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Customer created successfully.', customer: created });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

// Admin and staff can update customer
router.put('/:id', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { name, email, phone, company, billing_address } = req.body;

  db.prepare(`
    UPDATE customers
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        company = COALESCE(?, company),
        billing_address = COALESCE(?, billing_address)
    WHERE id = ?
  `).run(name, email, phone, company, billing_address, req.params.id);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json({ message: 'Customer updated successfully.', customer: updated });
});

export default router;
