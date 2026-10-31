import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  buildSubscriptionConfirmationTemplate,
  buildInvoiceReminderTemplate,
  dispatchNotification
} from '../services/notificationService.js';
import { generateInvoiceForSubscription } from '../services/billingService.js';

const router = express.Router();

// Helper to generate next unique subscription number
function generateSubscriptionNumber() {
  const currentYear = new Date().getFullYear();
  const pattern = `SUB-${currentYear}-%`;
  const lastSub = db.prepare(`
    SELECT number FROM subscriptions
    WHERE number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(pattern);

  let nextSeq = 1;
  if (lastSub && lastSub.number) {
    const parts = lastSub.number.split('-');
    if (parts.length >= 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  let candidate = `SUB-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  while (db.prepare('SELECT id FROM subscriptions WHERE number = ?').get(candidate)) {
    nextSeq++;
    candidate = `SUB-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  return candidate;
}

// SUB-5 & SUB-6: List subscriptions (Team sees all, Customer sees own only)
router.get('/', authenticate, (req, res) => {
  const { status, customer_id, plan_id, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT s.*,
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.billing_period, p.price as plan_price,
           (SELECT COUNT(*) FROM subscription_lines sl WHERE sl.subscription_id = s.id) as line_count,
           (SELECT COALESCE(SUM(sl.amount), 0) FROM subscription_lines sl WHERE sl.subscription_id = s.id) as total_recurring_amount
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE 1=1
  `;
  const params = [];

  // AUTH-7: Customer sees only their own subscriptions
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) {
      return res.json({ subscriptions: [], total: 0 });
    }
    query += ' AND s.customer_id = ?';
    params.push(cust.id);
  } else if (customer_id) {
    query += ' AND s.customer_id = ?';
    params.push(customer_id);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (plan_id) {
    query += ' AND s.plan_id = ?';
    params.push(plan_id);
  }

  if (search) {
    query += ' AND (s.number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  // Count total for pagination
  const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow ? countRow.total : 0;

  query += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 100, Number(offset) || 0);

  const subscriptions = db.prepare(query).all(...params);
  res.json({ subscriptions, total });
});

// Get single subscription with full lines, plan, and invoice history
router.get('/:id', authenticate, (req, res) => {
  const sub = db.prepare(`
    SELECT s.*,
           c.name as customer_name, c.company as customer_company, c.email as customer_email, c.billing_address,
           p.name as plan_name, p.billing_period, p.price as plan_price, p.min_quantity as plan_min_quantity
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  // AUTH-7: Customer security check
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== sub.customer_id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own subscriptions.' });
    }
  }

  // Lines with product & variant details
  const lines = db.prepare(`
    SELECT sl.*,
           pr.name as product_name, pr.type as product_type,
           pv.attribute as variant_attribute, pv.value as variant_value, pv.extra_price,
           tr.name as tax_name, tr.rate as tax_rate
    FROM subscription_lines sl
    JOIN products pr ON sl.product_id = pr.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    LEFT JOIN tax_rules tr ON sl.tax_id = tr.id
    WHERE sl.subscription_id = ?
    ORDER BY sl.id ASC
  `).all(sub.id);

  // Invoices generated for this subscription
  const invoices = db.prepare(`
    SELECT i.*,
      (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
    FROM invoices i
    WHERE i.subscription_id = ?
    ORDER BY i.id DESC
  `).all(sub.id);

  res.json({
    subscription: {
      ...sub,
      lines,
      invoices: invoices.map(inv => ({
        ...inv,
        outstanding: Math.max(0, Number((inv.total - inv.paid_amount).toFixed(2)))
      }))
    }
  });
});

// SUB-1 to SUB-4: Create subscription (Admin, Staff, or Customer Self-Service)
router.post('/', authenticate, (req, res) => {
  let {
    customer_id,
    plan_id,
    start_date,
    expiry_date,
    payment_terms = 'Immediate',
    status = 'draft',
    notes,
    lines
  } = req.body;

  // If customer creates subscription from self-service portal
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) return res.status(403).json({ error: 'Customer profile not found.' });
    customer_id = cust.id;
    status = 'active'; // Customer self-subscription becomes active immediately
    if (!start_date) start_date = new Date().toISOString().split('T')[0];
  }

  if (!customer_id || !plan_id || !start_date) {
    return res.status(400).json({ error: 'Customer, plan, and start date are required.' });
  }

  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id);
  if (!plan) {
    return res.status(400).json({ error: 'Selected plan does not exist.' });
  }

  // Check plan availability dates
  const today = new Date().toISOString().split('T')[0];
  if (plan.available_from && start_date < plan.available_from) {
    return res.status(400).json({ error: `Plan is only available from ${plan.available_from}.` });
  }
  if (plan.available_to && start_date > plan.available_to) {
    return res.status(400).json({ error: `Plan availability ended on ${plan.available_to}.` });
  }

  // Calculate total seats / quantity across lines
  let totalQuantity = 0;
  if (Array.isArray(lines)) {
    for (const l of lines) {
      totalQuantity += (Number(l.quantity) || 0);
    }
  }

  // Enforce PLAN-2: minimum quantity
  if (plan.min_quantity && totalQuantity < plan.min_quantity) {
    return res.status(400).json({
      error: `Plan requires a minimum total quantity of ${plan.min_quantity} (provided: ${totalQuantity}).`
    });
  }

  const subNumber = generateSubscriptionNumber();

  try {
    db.exec('BEGIN TRANSACTION;');

    const nextBilling = (status === 'active') ? start_date : start_date;

    const result = db.prepare(`
      INSERT INTO subscriptions (
        number, customer_id, plan_id, start_date, expiry_date,
        payment_terms, status, next_billing_date,
        auto_close, closable, pausable, renewable, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      subNumber,
      Number(customer_id),
      Number(plan_id),
      start_date,
      expiry_date || null,
      payment_terms,
      status,
      nextBilling,
      plan.auto_close,
      plan.closable,
      plan.pausable,
      plan.renewable,
      notes || null
    );

    const subscriptionId = Number(result.lastInsertRowid);

    if (Array.isArray(lines) && lines.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO subscription_lines (
          subscription_id, product_id, variant_id, quantity, unit_price, tax_id, amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        const qty = Math.max(1, Number(line.quantity) || 1);
        const price = Number(line.unit_price) || 0;
        const amount = qty * price;

        insertLine.run(
          subscriptionId,
          Number(line.product_id),
          line.variant_id ? Number(line.variant_id) : null,
          qty,
          price,
          line.tax_id ? Number(line.tax_id) : null,
          amount
        );
      }
    }

    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('subscription_created', 'Subscription Created', `Created subscription ${subNumber} with status "${status}"`, subscriptionId, 'subscription', req.user.name);

    db.exec('COMMIT;');

    // If subscription is created as active or confirmed, auto-generate cycle invoice and dispatch notifications
    let generatedInvoice = null;
    if (status === 'active' || status === 'confirmed') {
      try {
        const invRes = generateInvoiceForSubscription(subscriptionId, start_date);
        if (invRes && invRes.invoiceId) {
          generatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invRes.invoiceId);
        }
      } catch (invErr) {
        console.warn('Initial invoice generation notice:', invErr.message);
      }

      // Auto-dispatch subscription confirmation & invoice notices
      try {
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(customer_id));
        const subLines = db.prepare(`
          SELECT sl.*, p.name as product_name
          FROM subscription_lines sl
          JOIN products p ON sl.product_id = p.id
          WHERE sl.subscription_id = ?
        `).all(subscriptionId);

        const totalAmount = subLines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0) || plan.price;

        if (customer) {
          // 1. Subscription Confirmation (Real Email)
          const confirmTemplate = buildSubscriptionConfirmationTemplate({
            subscription: { id: subscriptionId, number: subNumber, start_date, next_billing_date: nextBilling },
            plan,
            customer,
            lines: subLines,
            totalAmount
          });

          dispatchNotification({
            customer_id: customer.id,
            subscription_id: subscriptionId,
            type: 'subscription_renewal',
            channel: 'email',
            subject: confirmTemplate.subject,
            email_html: confirmTemplate.emailHtml,
            recipient_email: customer.email,
            created_by: req.user.name
          });

          // 2. Invoice Due Notification if invoice created
          if (generatedInvoice) {
            const invItems = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(generatedInvoice.id);
            const invReminder = buildInvoiceReminderTemplate({
              invoice: generatedInvoice,
              customer,
              items: invItems,
              isOverdue: false
            });

            dispatchNotification({
              customer_id: customer.id,
              invoice_id: generatedInvoice.id,
              subscription_id: subscriptionId,
              type: 'invoice_due',
              channel: 'email',
              subject: invReminder.subject,
              email_html: invReminder.emailHtml,
              recipient_email: customer.email,
              created_by: req.user.name
            });
          }
        }
      } catch (notifErr) {
        console.error('Subscription confirmation notification error:', notifErr.message);
      }
    }

    res.status(201).json({
      message: 'Subscription created successfully. Confirmation & invoice notices dispatched.',
      subscriptionId,
      number: subNumber,
      invoiceId: generatedInvoice?.id
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error creating subscription:', err);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
});

// Update subscription
router.put('/:id', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  const {
    customer_id, plan_id, start_date, expiry_date, payment_terms, notes, lines
  } = req.body;

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      UPDATE subscriptions
      SET customer_id = COALESCE(?, customer_id),
          plan_id = COALESCE(?, plan_id),
          start_date = COALESCE(?, start_date),
          expiry_date = COALESCE(?, expiry_date),
          payment_terms = COALESCE(?, payment_terms),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(customer_id, plan_id, start_date, expiry_date, payment_terms, notes, req.params.id);

    if (Array.isArray(lines)) {
      db.prepare('DELETE FROM subscription_lines WHERE subscription_id = ?').run(req.params.id);

      const insertLine = db.prepare(`
        INSERT INTO subscription_lines (
          subscription_id, product_id, variant_id, quantity, unit_price, tax_id, amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        const qty = Math.max(1, Number(line.quantity) || 1);
        const price = Number(line.unit_price) || 0;
        insertLine.run(
          Number(req.params.id),
          Number(line.product_id),
          line.variant_id ? Number(line.variant_id) : null,
          qty,
          price,
          line.tax_id ? Number(line.tax_id) : null,
          qty * price
        );
      }
    }

    db.exec('COMMIT;');
    res.json({ message: 'Subscription updated successfully.' });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error updating subscription:', err);
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
});

// Customer self-service: update line quantity
router.patch('/:id/quantity', authenticate, (req, res) => {
  const { line_id, quantity } = req.body;
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== sub.customer_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
  }

  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(sub.plan_id);
  const minQty = plan ? plan.min_quantity : 1;
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < minQty) {
    return res.status(400).json({ error: `The minimum allowed quantity for this plan is ${minQty} license(s).` });
  }

  const line = db.prepare('SELECT * FROM subscription_lines WHERE id = ? AND subscription_id = ?').get(line_id, sub.id);
  if (!line) return res.status(404).json({ error: 'Subscription line not found.' });

  const newAmount = qty * line.unit_price;
  db.prepare('UPDATE subscription_lines SET quantity = ?, amount = ? WHERE id = ?').run(qty, newAmount, line_id);

  db.prepare(`
    INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('quantity_updated', 'Quantity Adjusted', `Adjusted line quantity to ${qty} ($${newAmount.toFixed(2)})`, sub.id, 'subscription', req.user.name);

  res.json({ message: 'Quantity updated successfully.', quantity: qty, amount: newAmount });
});

// SUB-4 & Section 5.1: State Machine Transitions
// Status flow: Draft -> Quotation -> Confirmed -> Active -> Closed
// Plus Paused & Renewed
router.post('/:id/transition', authenticate, (req, res) => {
  const { action } = req.body; // 'send_quote', 'confirm', 'activate', 'pause', 'resume', 'close', 'renew'
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id);

  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  // Customer portal permissions for self-serve actions
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust || cust.id !== sub.customer_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    // Customers can only perform customer self-service actions (pause, resume, renew, close)
    const allowedCustomerActions = ['pause', 'resume', 'close', 'renew', 'confirm'];
    if (!allowedCustomerActions.includes(action)) {
      return res.status(403).json({ error: `Customers cannot perform action '${action}'.` });
    }
  }

  let newStatus = sub.status;
  let nextBilling = sub.next_billing_date;
  let newExpiry = sub.expiry_date;

  switch (action) {
    case 'send_quote':
      if (sub.status !== 'draft') {
        return res.status(400).json({ error: `Cannot transition from '${sub.status}' to 'quotation'. Must be in 'draft'.` });
      }
      newStatus = 'quotation';
      break;

    case 'confirm':
      if (sub.status !== 'quotation' && sub.status !== 'draft') {
        return res.status(400).json({ error: `Cannot confirm a subscription with status '${sub.status}'.` });
      }
      newStatus = 'confirmed';
      break;

    case 'activate':
      if (sub.status !== 'confirmed' && sub.status !== 'draft') {
        return res.status(400).json({ error: `Cannot activate from status '${sub.status}'. Must be 'confirmed' or 'draft'.` });
      }
      newStatus = 'active';
      if (!nextBilling) {
        nextBilling = sub.start_date || new Date().toISOString().split('T')[0];
      }
      break;

    case 'pause':
      if (sub.status !== 'active') {
        return res.status(400).json({ error: 'Only active subscriptions can be paused.' });
      }
      if (!sub.pausable) {
        return res.status(400).json({ error: 'This subscription plan does not allow pausing.' });
      }
      newStatus = 'paused';
      break;

    case 'resume':
      if (sub.status !== 'paused') {
        return res.status(400).json({ error: 'Only paused subscriptions can be resumed.' });
      }
      newStatus = 'active';
      // Billing resumes on unpause
      const today = new Date().toISOString().split('T')[0];
      nextBilling = today;
      break;

    case 'close':
      if (sub.status === 'closed') {
        return res.status(400).json({ error: 'Subscription is already closed.' });
      }
      if (!sub.closable) {
        return res.status(400).json({ error: 'This subscription plan does not permit early closure.' });
      }
      newStatus = 'closed';
      break;

    case 'renew':
      if (!sub.renewable) {
        return res.status(400).json({ error: 'This subscription plan is not configured as renewable.' });
      }
      const plan = db.prepare('SELECT billing_period FROM plans WHERE id = ?').get(sub.plan_id);
      const currentExpiry = new Date(sub.expiry_date || Date.now());

      if (plan.billing_period === 'yearly') {
        currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      } else if (plan.billing_period === 'monthly') {
        currentExpiry.setMonth(currentExpiry.getMonth() + 1);
      } else if (plan.billing_period === 'weekly') {
        currentExpiry.setDate(currentExpiry.getDate() + 7);
      } else {
        currentExpiry.setDate(currentExpiry.getDate() + 1);
      }
      newExpiry = currentExpiry.toISOString().split('T')[0];
      newStatus = 'active';
      break;

    default:
      return res.status(400).json({ error: `Unknown action '${action}'.` });
  }

  db.prepare(`
    UPDATE subscriptions
    SET status = ?, next_billing_date = ?, expiry_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, nextBilling, newExpiry, sub.id);

  db.prepare(`
    INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'status_transition',
    `Subscription ${sub.number} ${action.toUpperCase()}`,
    `Transitioned from ${sub.status} -> ${newStatus}`,
    sub.id,
    'subscription',
    req.user.name
  );

  res.json({
    message: `Subscription transition to '${newStatus}' completed.`,
    status: newStatus,
    next_billing_date: nextBilling,
    expiry_date: newExpiry
  });
});

export default router;
