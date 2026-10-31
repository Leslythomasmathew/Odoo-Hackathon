import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List plans
router.get('/', authenticate, (req, res) => {
  const plans = db.prepare('SELECT * FROM plans ORDER BY id ASC').all();
  res.json({ plans });
});

// Get plan by ID
router.get('/:id', authenticate, (req, res) => {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }
  res.json({ plan });
});

// PLAN-1 to PLAN-4: Admin creates plan
router.post('/', authenticate, requireRole(['admin']), (req, res) => {
  const {
    name,
    price,
    billing_period,
    min_quantity,
    available_from,
    available_to,
    auto_close,
    closable,
    pausable,
    renewable
  } = req.body;

  if (!name || price === undefined || !billing_period) {
    return res.status(400).json({ error: 'Plan name, price, and billing period are required.' });
  }

  const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!validPeriods.includes(billing_period)) {
    return res.status(400).json({ error: `Invalid billing period. Must be one of: ${validPeriods.join(', ')}` });
  }

  try {
    const result = db.prepare(`
      INSERT INTO plans (
        name, price, billing_period, min_quantity,
        available_from, available_to, auto_close, closable, pausable, renewable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      Number(price) || 0,
      billing_period,
      Math.max(1, Number(min_quantity) || 1),
      available_from || null,
      available_to || null,
      auto_close ? 1 : 0,
      closable !== undefined ? (closable ? 1 : 0) : 1,
      pausable !== undefined ? (pausable ? 1 : 0) : 1,
      renewable !== undefined ? (renewable ? 1 : 0) : 1
    );

    const created = db.prepare('SELECT * FROM plans WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Plan created successfully.',
      plan: created
    });
  } catch (err) {
    console.error('Error creating plan:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
});

// Admin updates plan
router.put('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const {
    name, price, billing_period, min_quantity,
    available_from, available_to, auto_close, closable, pausable, renewable
  } = req.body;

  db.prepare(`
    UPDATE plans
    SET name = COALESCE(?, name),
        price = COALESCE(?, price),
        billing_period = COALESCE(?, billing_period),
        min_quantity = COALESCE(?, min_quantity),
        available_from = COALESCE(?, available_from),
        available_to = COALESCE(?, available_to),
        auto_close = COALESCE(?, auto_close),
        closable = COALESCE(?, closable),
        pausable = COALESCE(?, pausable),
        renewable = COALESCE(?, renewable)
    WHERE id = ?
  `).run(
    name, price, billing_period, min_quantity,
    available_from, available_to,
    auto_close !== undefined ? (auto_close ? 1 : 0) : undefined,
    closable !== undefined ? (closable ? 1 : 0) : undefined,
    pausable !== undefined ? (pausable ? 1 : 0) : undefined,
    renewable !== undefined ? (renewable ? 1 : 0) : undefined,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  res.json({ message: 'Plan updated successfully.', plan: updated });
});

// Admin deletes plan
router.delete('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const subCount = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = ?').get(req.params.id);
  if (subCount && subCount.count > 0) {
    return res.status(400).json({ error: `Cannot delete plan because it is being used by ${subCount.count} subscriptions.` });
  }

  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ message: 'Plan deleted successfully.' });
});

export default router;
