import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List tax rules
router.get('/', authenticate, (req, res) => {
  const taxes = db.prepare('SELECT * FROM tax_rules ORDER BY id ASC').all();
  res.json({ taxes });
});

// Admin creates tax rule
router.post('/', authenticate, requireRole(['admin']), (req, res) => {
  const { name, rate, is_active } = req.body;
  if (!name || rate === undefined) {
    return res.status(400).json({ error: 'Tax name and rate are required.' });
  }

  const result = db.prepare(`
    INSERT INTO tax_rules (name, rate, is_active)
    VALUES (?, ?, ?)
  `).run(name.trim(), Number(rate) || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1);

  const created = db.prepare('SELECT * FROM tax_rules WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Tax rule created successfully.', tax: created });
});

// Admin updates tax rule
router.put('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const { name, rate, is_active } = req.body;
  db.prepare(`
    UPDATE tax_rules
    SET name = COALESCE(?, name),
        rate = COALESCE(?, rate),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name, rate, is_active !== undefined ? (is_active ? 1 : 0) : undefined, req.params.id);

  const updated = db.prepare('SELECT * FROM tax_rules WHERE id = ?').get(req.params.id);
  res.json({ message: 'Tax rule updated successfully.', tax: updated });
});

// Admin deletes tax rule
router.delete('/:id', authenticate, requireRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM tax_rules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Tax rule deleted successfully.' });
});

export default router;
