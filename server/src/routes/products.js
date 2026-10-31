import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List all products with their variants
router.get('/', authenticate, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  const variants = db.prepare('SELECT * FROM product_variants ORDER BY id ASC').all();

  const variantMap = {};
  for (const v of variants) {
    if (!variantMap[v.product_id]) {
      variantMap[v.product_id] = [];
    }
    variantMap[v.product_id].push(v);
  }

  const result = products.map(p => ({
    ...p,
    variants: variantMap[p.id] || []
  }));

  res.json({ products: result });
});

// Get single product with variants
router.get('/:id', authenticate, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(product.id);
  res.json({
    product: {
      ...product,
      variants
    }
  });
});

// PROD-1: Admin adds product
router.post('/', authenticate, requireRole(['admin']), (req, res) => {
  const { name, type, sales_price, cost_price, notes, variants } = req.body;

  if (!name || !type || sales_price === undefined) {
    return res.status(400).json({ error: 'Product name, type, and sales price are required.' });
  }

  try {
    db.exec('BEGIN TRANSACTION;');

    const result = db.prepare(`
      INSERT INTO products (name, type, sales_price, cost_price, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), type.trim(), Number(sales_price) || 0, Number(cost_price) || 0, notes || null);

    const productId = Number(result.lastInsertRowid);

    // PROD-2 & PROD-3: Variants with price adjustment
    if (Array.isArray(variants) && variants.length > 0) {
      const insertVar = db.prepare(`
        INSERT INTO product_variants (product_id, attribute, value, extra_price)
        VALUES (?, ?, ?, ?)
      `);

      for (const v of variants) {
        if (v.attribute && v.value) {
          insertVar.run(productId, v.attribute.trim(), v.value.trim(), Number(v.extra_price) || 0);
        }
      }
    }

    db.exec('COMMIT;');

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    const createdVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(productId);

    res.status(201).json({
      message: 'Product created successfully.',
      product: {
        ...created,
        variants: createdVariants
      }
    });
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// Update product
router.put('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const { name, type, sales_price, cost_price, notes } = req.body;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.prepare(`
    UPDATE products
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        sales_price = COALESCE(?, sales_price),
        cost_price = COALESCE(?, cost_price),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, type, sales_price, cost_price, notes, req.params.id);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.id);

  res.json({
    message: 'Product updated successfully.',
    product: {
      ...updated,
      variants
    }
  });
});

// Delete product
router.delete('/:id', authenticate, requireRole(['admin']), (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted successfully.' });
});

// PROD-2 & PROD-3: Add variant to an existing product
router.post('/:id/variants', authenticate, requireRole(['admin']), (req, res) => {
  const { attribute, value, extra_price } = req.body;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (!attribute || !value) {
    return res.status(400).json({ error: 'Variant attribute and value are required.' });
  }

  const result = db.prepare(`
    INSERT INTO product_variants (product_id, attribute, value, extra_price)
    VALUES (?, ?, ?, ?)
  `).run(product.id, attribute.trim(), value.trim(), Number(extra_price) || 0);

  const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    message: 'Variant added successfully.',
    variant
  });
});

// Delete variant
router.delete('/variants/:id', authenticate, requireRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM product_variants WHERE id = ?').run(req.params.id);
  res.json({ message: 'Variant deleted successfully.' });
});

export default router;
