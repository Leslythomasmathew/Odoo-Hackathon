import express from 'express';
import { db } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import {
  getCurrentUsage,
  recordUsage,
  getFeatureDetails,
  getUsageAnalytics,
  getUsageHistory,
  getAlerts,
  markAlertRead,
  getCharges
} from '../services/usageService.js';
import { getFeatureCatalog } from '../services/featureService.js';

const router = express.Router();

/**
 * Helper to resolve and authorize subscription for the request.
 * Enforces strict customer data isolation (AUTH-7 & Section 12 test #14).
 */
function resolveAuthorizedSubscriptionId(req) {
  if (req.user.role === 'customer') {
    const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
    if (!cust) return null;

    // If query passes explicit subscription_id, verify customer owns it
    if (req.query.subscription_id || req.body?.subscription_id) {
      const requestedId = req.query.subscription_id || req.body.subscription_id;
      const owns = db.prepare('SELECT id FROM subscriptions WHERE id = ? AND customer_id = ?').get(requestedId, cust.id);
      if (!owns) {
        const err = new Error('Access denied: You can only access your own subscription usage data.');
        err.status = 403;
        throw err;
      }
      return owns.id;
    }

    // Default to customer's primary active subscription (first contracted)
    const activeSub = db.prepare(`
      SELECT id FROM subscriptions
      WHERE customer_id = ? AND status IN ('active', 'paused', 'confirmed', 'draft')
      ORDER BY (status = 'active') DESC, id ASC LIMIT 1
    `).get(cust.id);

    return activeSub ? activeSub.id : null;
  }

  // Admin or Staff
  if (req.query.subscription_id || req.body?.subscription_id) {
    return Number(req.query.subscription_id || req.body.subscription_id);
  }

  if (req.query.customer_id) {
    const custSub = db.prepare(`
      SELECT id FROM subscriptions
      WHERE customer_id = ? AND status IN ('active', 'paused', 'confirmed', 'draft')
      ORDER BY (status = 'active') DESC, id DESC LIMIT 1
    `).get(req.query.customer_id);
    return custSub ? custSub.id : null;
  }

  // Default to first active subscription
  const firstSub = db.prepare(`
    SELECT id FROM subscriptions
    WHERE status = 'active'
    ORDER BY id ASC LIMIT 1
  `).get();

  return firstSub ? firstSub.id : null;
}

// 1. List selectable subscriptions (for customer or admin switcher)
router.get('/subscriptions', authenticate, (req, res) => {
  try {
    let query = `
      SELECT s.id, s.number, s.status, s.start_date, s.next_billing_date,
             p.name as plan_name, p.billing_period,
             c.name as customer_name, c.company as customer_company
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'customer') {
      const cust = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(req.user.id);
      if (!cust) return res.json({ subscriptions: [] });
      query += ' AND s.customer_id = ?';
      params.push(cust.id);
    }

    query += ' ORDER BY (s.status = "active") DESC, s.id DESC';
    const subscriptions = db.prepare(query).all(...params);
    res.json({ subscriptions });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 2. Current Usage Overview for Active Subscription
router.get('/current', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) {
      return res.json({
        noSubscription: true,
        message: 'No active subscription found for this account.',
        features: []
      });
    }

    const usage = getCurrentUsage(subId);
    res.json(usage);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 3. Historical Usage by Billing Period
router.get('/history', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const history = getUsageHistory(subId);
    res.json(history);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 4. Feature Details & Consumption Drill-Down
router.get('/features/:featureKey', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const details = getFeatureDetails(subId, req.params.featureKey);
    res.json(details);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 5. Usage Analytics, Forecast & Intelligent Recommendations
router.get('/analytics', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const analytics = getUsageAnalytics(subId);
    res.json(analytics);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 6. Active and Historical Alerts
router.get('/alerts', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const isReadFilter = req.query.is_read !== undefined ? (req.query.is_read === 'true' ? 1 : 0) : null;
    const alerts = getAlerts(subId, { is_read: isReadFilter });
    res.json({ alerts });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 7. Mark Alert as Read
router.patch('/alerts/:id/read', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const result = markAlertRead(req.params.id, subId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 8. Overage Charges
router.get('/charges', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const charges = getCharges(subId);
    res.json(charges);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// 9. Record Usage Operation (Backend Hard Limit Enforcement & Idempotency)
router.post('/record', authenticate, (req, res) => {
  try {
    const subId = resolveAuthorizedSubscriptionId(req);
    if (!subId) return res.status(404).json({ error: 'No subscription found.' });

    const {
      feature_key,
      quantity = 1,
      operation_type = 'api_operation',
      source_ref = null,
      idempotency_key = null,
      metadata = null
    } = req.body;

    const result = recordUsage({
      subscription_id: subId,
      feature_key,
      quantity,
      operation_type,
      source_ref,
      idempotency_key,
      metadata
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'LIMIT_EXCEEDED') {
      return res.status(429).json({ error: err.message, code: err.code });
    }
    res.status(err.status || 400).json({ error: err.message });
  }
});

// 10. Multi-Industry Feature Catalog
router.get('/catalog', authenticate, (req, res) => {
  try {
    const { sector, feature_type, search } = req.query;
    const catalog = getFeatureCatalog({ sector, feature_type, search });
    res.json({ catalog });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
