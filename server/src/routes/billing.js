import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { runBulkBilling } from '../services/billingService.js';

const router = express.Router();

// Preview which subscriptions are due for billing
router.get('/preview', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  const dueSubscriptions = db.prepare(`
    SELECT s.id, s.number, s.customer_id, s.start_date, s.next_billing_date, s.payment_terms,
           c.name as customer_name, c.company as customer_company,
           p.name as plan_name, p.billing_period,
           (SELECT COALESCE(SUM(sl.amount), 0) FROM subscription_lines sl WHERE sl.subscription_id = s.id) as estimated_recurring_subtotal,
           (SELECT COUNT(*) FROM invoices inv WHERE inv.subscription_id = s.id AND inv.billing_period_start = s.next_billing_date) as already_billed
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
      AND (s.next_billing_date IS NULL OR s.next_billing_date <= ?)
    ORDER BY s.next_billing_date ASC
  `).all(targetDate);

  res.json({
    targetDate,
    totalDue: dueSubscriptions.length,
    dueSubscriptions
  });
});

// INV-2: Trigger automated bulk billing run
router.post('/run', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { simulationDate } = req.body;
  const startTime = Date.now();

  try {
    const results = runBulkBilling(simulationDate, req.user.name);
    const durationMs = Date.now() - startTime;

    db.prepare(`
      INSERT INTO activity_logs (type, title, details, created_by)
      VALUES (?, ?, ?, ?)
    `).run(
      'bulk_billing_run',
      'Bulk Billing Run Executed',
      `Processed ${results.totalFound} subscriptions; generated ${results.generatedCount} invoices ($${results.totalAmountBilled.toFixed(2)}); skipped ${results.skippedCount} already billed. (${durationMs}ms)`,
      req.user.name
    );

    res.json({
      message: `Bulk billing run completed in ${durationMs}ms.`,
      durationMs,
      ...results
    });
  } catch (err) {
    console.error('Bulk billing execution error:', err);
    res.status(500).json({ error: 'Bulk billing run failed: ' + err.message });
  }
});

export default router;
