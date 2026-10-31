import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// REP-1, REP-2, REP-3: Finance Dashboard & Reporting metrics
router.get('/dashboard', authenticate, requireRole(['admin', 'staff']), (req, res) => {
  const { startDate, endDate, customerId, planId } = req.query;
  const today = new Date().toISOString().split('T')[0];

  // 1. How many subscriptions are active?
  const activeSubsRow = db.prepare(`
    SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
  `).get();
  const activeSubscriptions = activeSubsRow.count;

  // Subscriptions by status
  const subsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM subscriptions GROUP BY status
  `).all();

  // 2. How much revenue came in? (total payments received)
  let revenueQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE 1=1';
  const revParams = [];
  if (startDate) {
    revenueQuery += ' AND payment_date >= ?';
    revParams.push(startDate);
  }
  if (endDate) {
    revenueQuery += ' AND payment_date <= ?';
    revParams.push(endDate);
  }
  const revenueRow = db.prepare(revenueQuery).get(...revParams);
  const totalRevenue = Number(revenueRow.total.toFixed(2));

  // 3. How much is still owed? (outstanding across all confirmed invoices)
  const outstandingRow = db.prepare(`
    SELECT
      COALESCE(SUM(i.total), 0) -
      COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices inv ON p.invoice_id = inv.id WHERE inv.status != 'cancelled'), 0) as total_owed
    FROM invoices i
    WHERE i.status != 'cancelled'
  `).get();
  const totalOutstanding = Math.max(0, Number((outstandingRow.total_owed || 0).toFixed(2)));

  // 4. Which invoices are overdue? (Confirmed, due_date < today, outstanding > 0)
  const overdueInvoices = db.prepare(`
    SELECT i.id, i.number, i.total, i.issue_date, i.due_date, i.status,
           c.name as customer_name, c.company as customer_company, c.email as customer_email,
           (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) as paid_amount
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.status = 'confirmed' AND i.due_date < ?
      AND (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id) < i.total
    ORDER BY i.due_date ASC
  `).all(today);

  const enrichedOverdue = overdueInvoices.map(inv => ({
    ...inv,
    outstanding: Math.max(0, Number((inv.total - inv.paid_amount).toFixed(2)))
  }));

  const overdueCount = enrichedOverdue.length;
  const overdueTotalAmount = Number(enrichedOverdue.reduce((sum, inv) => sum + inv.outstanding, 0).toFixed(2));

  // 5. Estimated MRR (Monthly Recurring Revenue) and ARR
  // Monthly subscriptions recurring total + (yearly recurring total / 12) + (weekly * 4) + (daily * 30)
  const recurringLines = db.prepare(`
    SELECT p.billing_period, sl.amount
    FROM subscription_lines sl
    JOIN subscriptions s ON sl.subscription_id = s.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
  `).all();

  let estimatedMRR = 0;
  for (const line of recurringLines) {
    if (line.billing_period === 'monthly') estimatedMRR += line.amount;
    else if (line.billing_period === 'yearly') estimatedMRR += (line.amount / 12);
    else if (line.billing_period === 'weekly') estimatedMRR += (line.amount * 4.33);
    else if (line.billing_period === 'daily') estimatedMRR += (line.amount * 30);
  }
  estimatedMRR = Number(estimatedMRR.toFixed(2));
  const estimatedARR = Number((estimatedMRR * 12).toFixed(2));

  // 6. Recent Payments
  const recentPayments = db.prepare(`
    SELECT p.*, i.number as invoice_number, c.name as customer_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
    ORDER BY p.id DESC LIMIT 5
  `).all();

  // 7. Revenue by payment method
  const revenueByMethod = db.prepare(`
    SELECT method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM payments
    GROUP BY method
  `).all();

  // 8. Subscriptions by Plan
  const subsByPlan = db.prepare(`
    SELECT p.name as plan_name, p.billing_period, COUNT(s.id) as count
    FROM plans p
    LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'active'
    GROUP BY p.id
  `).all();

  // 9. Monthly revenue trend for chart (last 6 months)
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) as month,
           COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE payment_date >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  res.json({
    kpis: {
      activeSubscriptions,
      totalRevenue,
      totalOutstanding,
      overdueCount,
      overdueTotalAmount,
      estimatedMRR,
      estimatedARR
    },
    subsByStatus,
    subsByPlan,
    revenueByMethod,
    overdueInvoices: enrichedOverdue,
    recentPayments,
    monthlyTrend
  });
});

export default router;
