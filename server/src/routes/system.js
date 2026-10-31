import express from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { seedData, generateBenchmarkData } from '../db/seed.js';

const router = express.Router();

// Get activity logs
router.get('/logs', authenticate, (req, res) => {
  const { limit = 50 } = req.query;
  const logs = db.prepare(`
    SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?
  `).all(Number(limit) || 50);

  res.json({ logs });
});

// Reseed database with standard Brightloop demo data
router.post('/reseed', authenticate, requireRole(['admin']), (req, res) => {
  try {
    seedData(true);
    res.json({ message: 'Database reseeded successfully with Brightloop demonstration data.' });
  } catch (err) {
    console.error('Reseed error:', err);
    res.status(500).json({ error: 'Failed to reseed database: ' + err.message });
  }
});

// Non-functional requirement benchmark test:
// Generate 1,000+ subscriptions and measure page response time (< 2 seconds)
router.post('/benchmark', authenticate, requireRole(['admin']), (req, res) => {
  const count = Number(req.body.count) || 1000;
  try {
    const benchResult = generateBenchmarkData(count);

    // Measure query performance with 1,000+ records
    const queryStart = Date.now();
    const activeSubs = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").get();
    const invoices = db.prepare("SELECT COUNT(*) as count FROM invoices").get();
    const payments = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments").get();
    const queryDurationMs = Date.now() - queryStart;

    res.json({
      message: `Benchmark generation of ${count} subscriptions completed in ${benchResult.elapsedMs}ms.`,
      generationTimeMs: benchResult.elapsedMs,
      queryResponseTimeMs: queryDurationMs,
      targetResponseTimeSec: 2.0,
      meetsNonFunctionalRequirement: queryDurationMs < 2000,
      stats: {
        activeSubscriptionsCount: activeSubs.count,
        totalInvoicesCount: invoices.count,
        totalPayments: payments.total
      }
    });
  } catch (err) {
    console.error('Benchmark error:', err);
    res.status(500).json({ error: 'Benchmark test failed: ' + err.message });
  }
});

export default router;
