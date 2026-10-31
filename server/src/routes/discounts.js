import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List discounts (with computed status: Active, Expired, Limit Reached)
router.get('/', authenticate, (req, res) => {
  const discounts = db.prepare('SELECT * FROM discounts ORDER BY id DESC').all();
  const today = new Date().toISOString().split('T')[0];

  const enriched = discounts.map(d => {
    let status = 'active';
    if (!d.is_active) {
      status = 'disabled';
    } else if (d.end_date && d.end_date < today) {
      status = 'expired';
    } else if (d.usage_limit && d.times_used >= d.usage_limit) {
      status = 'limit_reached';
    }
    return { ...d, computed_status: status };
  });

  res.json({ discounts: enriched });
});

// Get single discount
router.get('/:id', authenticate, (req, res) => {
  const discount = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  if (!discount) {
    return res.status(404).json({ error: 'Discount not found.' });
  }
  res.json({ discount });
});

// DISC-1: Only the admin can create discount rules
router.post('/', authenticate, requireRole(['admin']), (req, res) => {
  const {
    code,
    name,
    type,
    value,
    min_purchase,
    min_quantity,
    start_date,
    end_date,
    usage_limit,
    scope,
    target_product_id,
    is_active
  } = req.body;

  if (!code || !name || !type || value === undefined) {
    return res.status(400).json({ error: 'Code, name, type (fixed/percentage), and value are required.' });
  }

  if (!['fixed', 'percentage'].includes(type)) {
    return res.status(400).json({ error: 'Discount type must be either "fixed" or "percentage".' });
  }

  const validScope = scope === 'specific_products' ? 'specific_products' : 'whole_subscription';

  // Check code uniqueness
  const existing = db.prepare('SELECT id FROM discounts WHERE UPPER(code) = UPPER(?)').get(code.trim());
  if (existing) {
    return res.status(400).json({ error: `A discount rule with code "${code.trim()}" already exists.` });
  }

  try {
    const result = db.prepare(`
      INSERT INTO discounts (
        code, name, type, value, min_purchase, min_quantity,
        start_date, end_date, usage_limit, times_used,
        scope, target_product_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      code.trim().toUpperCase(),
      name.trim(),
      type,
      Number(value) || 0,
      Number(min_purchase) || 0,
      Number(min_quantity) || 0,
      start_date || null,
      end_date || null,
      usage_limit ? Number(usage_limit) : null,
      validScope,
      target_product_id ? Number(target_product_id) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    const created = db.prepare('SELECT * FROM discounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Discount rule created successfully.', discount: created });
  } catch (err) {
    console.error('Error creating discount:', err);
    res.status(500).json({ error: 'Failed to create discount rule.' });
  }
});

// Admin updates discount
router.put('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const discount = db.prepare('SELECT id FROM discounts WHERE id = ?').get(req.params.id);
  if (!discount) {
    return res.status(404).json({ error: 'Discount rule not found.' });
  }

  const {
    name,
    type,
    value,
    min_purchase,
    min_quantity,
    start_date,
    end_date,
    usage_limit,
    scope,
    target_product_id,
    is_active
  } = req.body;

  db.prepare(`
    UPDATE discounts
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        min_purchase = COALESCE(?, min_purchase),
        min_quantity = COALESCE(?, min_quantity),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        usage_limit = COALESCE(?, usage_limit),
        scope = COALESCE(?, scope),
        target_product_id = COALESCE(?, target_product_id),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    name, type, value, min_purchase, min_quantity,
    start_date, end_date, usage_limit, scope, target_product_id,
    is_active !== undefined ? (is_active ? 1 : 0) : undefined,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM discounts WHERE id = ?').get(req.params.id);
  res.json({ message: 'Discount rule updated successfully.', discount: updated });
});

// Admin deletes discount
router.delete('/:id', authenticate, requireRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM discounts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Discount rule deleted successfully.' });
});

export default router;
