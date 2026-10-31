import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List quotation templates with plan details and lines
router.get('/', authenticate, (req, res) => {
  const templates = db.prepare(`
    SELECT qt.*, p.name as plan_name, p.billing_period, p.price as plan_price
    FROM quotation_templates qt
    JOIN plans p ON qt.plan_id = p.id
    ORDER BY qt.id DESC
  `).all();

  const lines = db.prepare(`
    SELECT qtl.*, pr.name as product_name, pv.value as variant_value, pv.extra_price
    FROM quotation_template_lines qtl
    JOIN products pr ON qtl.product_id = pr.id
    LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
    ORDER BY qtl.id ASC
  `).all();

  const lineMap = {};
  for (const l of lines) {
    if (!lineMap[l.template_id]) lineMap[l.template_id] = [];
    lineMap[l.template_id].push(l);
  }

  const result = templates.map(t => ({
    ...t,
    lines: lineMap[t.id] || []
  }));

  res.json({ templates: result });
});

// Get single template
router.get('/:id', authenticate, (req, res) => {
  const template = db.prepare(`
    SELECT qt.*, p.name as plan_name, p.billing_period, p.price as plan_price
    FROM quotation_templates qt
    JOIN plans p ON qt.plan_id = p.id
    WHERE qt.id = ?
  `).get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Quotation template not found.' });
  }

  const lines = db.prepare(`
    SELECT qtl.*, pr.name as product_name, pv.value as variant_value, pv.extra_price
    FROM quotation_template_lines qtl
    JOIN products pr ON qtl.product_id = pr.id
    LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
    WHERE qtl.template_id = ?
  `).all(template.id);

  res.json({ template: { ...template, lines } });
});

// Admin and staff can create quotation templates
router.post('/', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { name, plan_id, validity_days, notes, lines } = req.body;

  if (!name || !plan_id) {
    return res.status(400).json({ error: 'Template name and plan are required.' });
  }

  try {
    db.exec('BEGIN TRANSACTION;');

    const result = db.prepare(`
      INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), Number(plan_id), Number(validity_days) || 30, notes || null);

    const templateId = Number(result.lastInsertRowid);

    if (Array.isArray(lines) && lines.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        insertLine.run(
          templateId,
          Number(line.product_id),
          line.variant_id ? Number(line.variant_id) : null,
          Math.max(1, Number(line.quantity) || 1),
          Number(line.unit_price) || 0
        );
      }
    }

    db.exec('COMMIT;');

    res.status(201).json({
      message: 'Quotation template created successfully.',
      templateId
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create quotation template.' });
  }
});

// Delete template
router.delete('/:id', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  db.prepare('DELETE FROM quotation_templates WHERE id = ?').run(req.params.id);
  res.json({ message: 'Quotation template deleted successfully.' });
});

export default router;
