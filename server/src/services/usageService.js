import { db } from '../db/database.js';
import { getFeatureByKey, getFeaturesForPlan } from './featureService.js';

/**
 * Usage Tracking Engine
 * Dynamic, sector-agnostic, idempotent usage tracking with backend limit enforcement,
 * automated alerts, and overage billing calculations.
 */

export function getOrCreateCurrentPeriod(subscriptionId) {
  const sub = db.prepare(`
    SELECT s.*, p.billing_period
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(subscriptionId);

  if (!sub) {
    throw new Error(`Subscription #${subscriptionId} not found.`);
  }

  const today = new Date().toISOString().split('T')[0];

  // Check for existing active period that covers today
  let period = db.prepare(`
    SELECT * FROM usage_periods
    WHERE subscription_id = ? AND status = 'active'
    ORDER BY id DESC LIMIT 1
  `).get(subscriptionId);

  if (period) {
    return period;
  }

  // Calculate period boundaries based on subscription dates and plan
  let periodStart = sub.start_date || today;
  let periodEnd = sub.next_billing_date;

  if (!periodEnd) {
    const startObj = new Date(periodStart);
    if (sub.billing_period === 'daily') {
      startObj.setDate(startObj.getDate() + 1);
    } else if (sub.billing_period === 'weekly') {
      startObj.setDate(startObj.getDate() + 7);
    } else if (sub.billing_period === 'yearly') {
      startObj.setFullYear(startObj.getFullYear() + 1);
    } else {
      // Monthly default
      startObj.setMonth(startObj.getMonth() + 1);
    }
    periodEnd = startObj.toISOString().split('T')[0];
  }

  // Insert new active period
  const result = db.prepare(`
    INSERT INTO usage_periods (subscription_id, period_start, period_end, status)
    VALUES (?, ?, ?, 'active')
  `).run(subscriptionId, periodStart, periodEnd);

  return db.prepare('SELECT * FROM usage_periods WHERE id = ?').get(Number(result.lastInsertRowid));
}

export function getCurrentUsage(subscriptionId) {
  const sub = db.prepare(`
    SELECT s.*,
           c.id as customer_id, c.name as customer_name, c.company as customer_company, c.email as customer_email,
           p.name as plan_name, p.billing_period, p.price as plan_price
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(subscriptionId);

  if (!sub) {
    throw new Error(`Subscription #${subscriptionId} not found.`);
  }

  const period = getOrCreateCurrentPeriod(subscriptionId);
  const planFeatures = getFeaturesForPlan(sub.plan_id);

  let totalIncluded = planFeatures.length;
  let activelyTracked = 0;
  let nearingLimitCount = 0;
  let exceededCount = 0;
  let totalPendingOverageAmount = 0;

  const features = planFeatures.map(pf => {
    // Current recorded usage in this period
    const usageRow = db.prepare(`
      SELECT usage_value, last_recorded_at
      FROM subscription_usage
      WHERE subscription_id = ? AND feature_id = ? AND period_id = ?
    `).get(subscriptionId, pf.feature_id, period.id);

    const actualUsage = usageRow ? Number(usageRow.usage_value) : 0;
    const isUnlimited = pf.is_unlimited === 1 || pf.allowance === null;
    const allowance = isUnlimited ? null : Number(pf.allowance);

    let remaining = null;
    let percentage = 0;
    let status = 'normal';

    if (isUnlimited) {
      status = 'unlimited';
      activelyTracked++;
    } else if (allowance > 0) {
      activelyTracked++;
      remaining = Math.max(0, Number((allowance - actualUsage).toFixed(2)));
      percentage = Number(((actualUsage / allowance) * 100).toFixed(1));

      if (actualUsage >= allowance) {
        status = 'exceeded';
        exceededCount++;
      } else if (percentage >= 90) {
        status = 'critical';
        nearingLimitCount++;
      } else if (percentage >= 80) {
        status = 'warning';
        nearingLimitCount++;
      } else {
        status = 'normal';
      }
    } else {
      // 0 allowance (e.g. feature not accessible in this plan)
      remaining = 0;
      percentage = actualUsage > 0 ? 100 : 0;
      status = actualUsage > 0 ? 'exceeded' : 'disabled';
    }

    // Overage computation
    let overageUnits = 0;
    let overageAmount = 0;
    if (pf.overage_allowed === 1 && allowance !== null && actualUsage > allowance) {
      overageUnits = Number((actualUsage - allowance).toFixed(2));
      overageAmount = Number((overageUnits * pf.overage_rate).toFixed(2));
      totalPendingOverageAmount += overageAmount;
    }

    // Active alerts for this feature
    const alerts = db.prepare(`
      SELECT * FROM usage_alerts
      WHERE subscription_id = ? AND feature_id = ? AND period_id = ?
      ORDER BY threshold_percent DESC
    `).all(subscriptionId, pf.feature_id, period.id);

    return {
      feature_id: pf.feature_id,
      feature_key: pf.feature_key,
      name: pf.feature_name,
      description: pf.feature_description,
      sector: pf.feature_sector,
      type: pf.feature_type,
      unit: pf.feature_unit,
      allowance,
      is_unlimited: isUnlimited,
      actual_usage: actualUsage,
      remaining,
      percentage,
      status,
      policy: pf.policy,
      overage_allowed: pf.overage_allowed === 1,
      overage_rate: pf.overage_rate,
      overage_units: overageUnits,
      overage_amount: overageAmount,
      last_recorded_at: usageRow ? usageRow.last_recorded_at : null,
      alerts
    };
  });

  // Calculate unread alerts
  const unreadAlertsRow = db.prepare(`
    SELECT COUNT(*) as count FROM usage_alerts
    WHERE subscription_id = ? AND period_id = ? AND is_read = 0
  `).get(subscriptionId, period.id);

  return {
    subscription: {
      id: sub.id,
      number: sub.number,
      customer_id: sub.customer_id,
      customer_name: sub.customer_name,
      customer_company: sub.customer_company,
      customer_email: sub.customer_email,
      plan_name: sub.plan_name,
      plan_price: sub.plan_price,
      billing_period: sub.billing_period,
      status: sub.status,
      start_date: sub.start_date,
      expiry_date: sub.expiry_date,
      next_billing_date: sub.next_billing_date
    },
    period: {
      id: period.id,
      start: period.period_start,
      end: period.period_end,
      status: period.status
    },
    overview: {
      total_included_features: totalIncluded,
      actively_tracked_features: activelyTracked,
      features_nearing_limit: nearingLimitCount,
      features_exceeded: exceededCount,
      total_pending_overage_amount: Number(totalPendingOverageAmount.toFixed(2)),
      unread_alerts_count: unreadAlertsRow ? unreadAlertsRow.count : 0
    },
    features
  };
}

export function recordUsage(params) {
  const {
    subscription_id,
    feature_key,
    quantity = 1,
    operation_type = 'manual_record',
    source_ref = null,
    idempotency_key = null,
    metadata = null
  } = params;

  if (!subscription_id) throw new Error('subscription_id is required.');
  if (!feature_key) throw new Error('feature_key is required.');
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) throw new Error('quantity must be a positive number.');

  // Check idempotency first
  if (idempotency_key) {
    const existingEvent = db.prepare('SELECT * FROM usage_events WHERE idempotency_key = ?').get(idempotency_key);
    if (existingEvent) {
      return {
        success: true,
        is_duplicate: true,
        message: `Event with idempotency key '${idempotency_key}' already processed.`,
        event: existingEvent
      };
    }
  }

  const sub = db.prepare('SELECT id, plan_id, status FROM subscriptions WHERE id = ?').get(subscription_id);
  if (!sub) {
    throw new Error(`Subscription #${subscription_id} not found.`);
  }

  // Feature validation
  const feature = getFeatureByKey(feature_key);
  if (!feature) {
    throw new Error(`Feature '${feature_key}' not found in catalog.`);
  }

  // Plan feature entitlement check
  const planFeature = db.prepare(`
    SELECT * FROM plan_features
    WHERE plan_id = ? AND feature_id = ?
  `).get(sub.plan_id, feature.id);

  if (!planFeature) {
    throw new Error(`Feature '${feature.name}' (${feature_key}) is not included in the customer's current plan.`);
  }

  const period = getOrCreateCurrentPeriod(subscription_id);

  // Fetch current usage
  const currentUsageRow = db.prepare(`
    SELECT id, usage_value FROM subscription_usage
    WHERE subscription_id = ? AND feature_id = ? AND period_id = ?
  `).get(subscription_id, feature.id, period.id);

  const prevUsage = currentUsageRow ? Number(currentUsageRow.usage_value) : 0;
  const newUsage = Number((prevUsage + numQty).toFixed(2));
  const isUnlimited = planFeature.is_unlimited === 1 || planFeature.allowance === null;
  const allowance = isUnlimited ? null : Number(planFeature.allowance);

  // BACKEND ENFORCEMENT OF HARD LIMIT POLICY
  if (!isUnlimited && planFeature.policy === 'hard_limit') {
    if (newUsage > allowance) {
      const err = new Error(`Usage limit reached for '${feature.name}'. Allowed: ${allowance} ${feature.unit}, Current: ${prevUsage}, Requested: +${numQty}. Action blocked by plan policy.`);
      err.code = 'LIMIT_EXCEEDED';
      err.status = 429;
      throw err;
    }
  }

  // Execute database updates in transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. Record event in usage_events
    const eventRes = db.prepare(`
      INSERT INTO usage_events (
        idempotency_key, subscription_id, feature_id, period_id,
        quantity, operation_type, source_ref, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      idempotency_key,
      subscription_id,
      feature.id,
      period.id,
      numQty,
      operation_type,
      source_ref,
      typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata
    );

    // 2. Upsert subscription_usage
    if (currentUsageRow) {
      db.prepare(`
        UPDATE subscription_usage
        SET usage_value = ?, last_recorded_at = datetime('now')
        WHERE id = ?
      `).run(newUsage, currentUsageRow.id);
    } else {
      db.prepare(`
        INSERT INTO subscription_usage (subscription_id, feature_id, period_id, usage_value, last_recorded_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(subscription_id, feature.id, period.id, newUsage);
    }

    // 3. Update overage charges if overage is allowed
    let overageUnits = 0;
    let overageAmount = 0;
    if (planFeature.overage_allowed === 1 && allowance !== null && newUsage > allowance) {
      overageUnits = Number((newUsage - allowance).toFixed(2));
      overageAmount = Number((overageUnits * planFeature.overage_rate).toFixed(2));

      const existingCharge = db.prepare(`
        SELECT id FROM usage_charges
        WHERE subscription_id = ? AND feature_id = ? AND period_id = ?
      `).get(subscription_id, feature.id, period.id);

      if (existingCharge) {
        db.prepare(`
          UPDATE usage_charges
          SET units_over = ?, rate = ?, amount = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(overageUnits, planFeature.overage_rate, overageAmount, existingCharge.id);
      } else {
        db.prepare(`
          INSERT INTO usage_charges (subscription_id, feature_id, period_id, units_over, rate, amount, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `).run(subscription_id, feature.id, period.id, overageUnits, planFeature.overage_rate, overageAmount);
      }
    }

    // 4. Threshold Alert Evaluations (50%, 80%, 90%, 100%)
    const triggeredAlerts = [];
    if (!isUnlimited && allowance > 0) {
      const prevPct = (prevUsage / allowance) * 100;
      const newPct = (newUsage / allowance) * 100;

      const thresholds = [
        { pct: 50, sev: 'info', msg: `${feature.name} reached 50% allowance (${newUsage} / ${allowance} ${feature.unit}).` },
        { pct: 80, sev: 'warning', msg: `${feature.name} crossed 80% allowance (${newUsage} / ${allowance} ${feature.unit}). Plan nearing capacity.` },
        { pct: 90, sev: 'critical', msg: `CRITICAL: ${feature.name} reached 90% allowance (${newUsage} / ${allowance} ${feature.unit}).` },
        { pct: 100, sev: 'danger', msg: `LIMIT REACHED: ${feature.name} reached 100% allowance (${allowance} ${feature.unit}).` }
      ];

      for (const t of thresholds) {
        if (newPct >= t.pct && prevPct < t.pct) {
          // Check if already sent in this period
          const exists = db.prepare(`
            SELECT id FROM usage_alerts
            WHERE subscription_id = ? AND feature_id = ? AND period_id = ? AND threshold_percent = ?
          `).get(subscription_id, feature.id, period.id, t.pct);

          if (!exists) {
            db.prepare(`
              INSERT INTO usage_alerts (subscription_id, feature_id, period_id, threshold_percent, message, severity, is_read)
              VALUES (?, ?, ?, ?, ?, ?, 0)
            `).run(subscription_id, feature.id, period.id, t.pct, t.msg, t.sev);
            triggeredAlerts.push({ threshold: t.pct, message: t.msg, severity: t.sev });
          }
        }
      }
    }

    db.exec('COMMIT;');

    return {
      success: true,
      subscription_id,
      feature_key,
      feature_name: feature.name,
      previous_usage: prevUsage,
      new_usage: newUsage,
      allowance,
      is_unlimited: isUnlimited,
      overage_units: overageUnits,
      overage_amount: overageAmount,
      triggered_alerts: triggeredAlerts,
      event_id: Number(eventRes.lastInsertRowid)
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function getFeatureDetails(subscriptionId, featureKey) {
  const current = getCurrentUsage(subscriptionId);
  const feat = current.features.find(f => f.feature_key === featureKey);

  if (!feat) {
    throw new Error(`Feature '${featureKey}' is not configured for subscription #${subscriptionId}.`);
  }

  // Daily consumption breakdown over the last 30 days
  const dailyHistory = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as date,
           COALESCE(SUM(quantity), 0) as total_quantity,
           COUNT(*) as event_count
    FROM usage_events
    WHERE subscription_id = ? AND feature_id = ?
    GROUP BY date
    ORDER BY date DESC LIMIT 30
  `).all(subscriptionId, feat.feature_id);

  // Recent 15 events
  const recentEvents = db.prepare(`
    SELECT * FROM usage_events
    WHERE subscription_id = ? AND feature_id = ?
    ORDER BY id DESC LIMIT 15
  `).all(subscriptionId, feat.feature_id);

  // Associated charge if any
  const charge = db.prepare(`
    SELECT * FROM usage_charges
    WHERE subscription_id = ? AND feature_id = ? AND period_id = ?
  `).get(subscriptionId, feat.feature_id, current.period.id);

  return {
    subscription: current.subscription,
    period: current.period,
    feature: feat,
    daily_history: dailyHistory,
    recent_events: recentEvents,
    charge: charge || null
  };
}

export function getUsageAnalytics(subscriptionId) {
  const current = getCurrentUsage(subscriptionId);

  // Daily trend across all features for the last 14 days
  const dailyTrends = db.prepare(`
    SELECT strftime('%Y-%m-%d', ue.created_at) as date,
           fc.key as feature_key,
           fc.name as feature_name,
           fc.unit,
           COALESCE(SUM(ue.quantity), 0) as amount
    FROM usage_events ue
    JOIN feature_catalog fc ON ue.feature_id = fc.id
    WHERE ue.subscription_id = ? AND ue.created_at >= date('now', '-14 days')
    GROUP BY date, fc.id
    ORDER BY date ASC
  `).all(subscriptionId);

  // Top consumed features by percentage of limit
  const featuresWithLimit = current.features.filter(f => !f.is_unlimited && f.allowance > 0);
  const mostUsed = [...featuresWithLimit].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  const leastUsed = [...featuresWithLimit].sort((a, b) => a.percentage - b.percentage).slice(0, 5);
  const nearingLimit = featuresWithLimit.filter(f => f.percentage >= 80);

  // Forecasting period-end consumption
  // Days elapsed in current period
  const start = new Date(current.period.start);
  const end = new Date(current.period.end);
  const now = new Date();
  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(1, Math.min(totalDays, Math.round((now - start) / (1000 * 60 * 60 * 24))));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const forecast = featuresWithLimit.map(f => {
    const dailyBurnRate = Number((f.actual_usage / daysElapsed).toFixed(2));
    const projectedUsage = Number((f.actual_usage + (dailyBurnRate * daysRemaining)).toFixed(2));
    const projectedPercentage = Number(((projectedUsage / f.allowance) * 100).toFixed(1));
    const willExceed = projectedUsage > f.allowance;

    return {
      feature_key: f.feature_key,
      name: f.name,
      unit: f.unit,
      allowance: f.allowance,
      actual_usage: f.actual_usage,
      daily_burn_rate: dailyBurnRate,
      projected_usage: projectedUsage,
      projected_percentage: projectedPercentage,
      will_exceed: willExceed
    };
  });

  // Intelligent Recommendations
  const recommendations = [];
  nearingLimit.forEach(f => {
    recommendations.push({
      type: 'upgrade_warning',
      feature_key: f.feature_key,
      title: `${f.name} approaching capacity`,
      description: `${f.name} is currently at ${f.percentage}% of your included quota with ${daysRemaining} days left in the billing cycle. Upgrading to a higher tier plan ensures uninterrupted operations.`,
      action: 'Upgrade Plan'
    });
  });

  if (current.overview.total_pending_overage_amount > 0) {
    recommendations.push({
      type: 'overage_cost',
      title: 'Active Overage Incurred',
      description: `Your subscription has accumulated $${current.overview.total_pending_overage_amount.toFixed(2)} in pending overage charges. Switching to our annual Professional or Enterprise package can reduce unit costs by up to 50%.`,
      action: 'Review Pricing'
    });
  }

  // Check for unused access features
  current.features.filter(f => f.type === 'access' && f.actual_usage === 0).forEach(f => {
    recommendations.push({
      type: 'feature_adoption',
      feature_key: f.feature_key,
      title: `Unlock included feature: ${f.name}`,
      description: `Your plan includes full access to ${f.name}, but you haven't enabled or configured it yet.`,
      action: 'Learn More'
    });
  });

  return {
    subscription: current.subscription,
    period: current.period,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    daily_trends: dailyTrends,
    most_used: mostUsed,
    least_used: leastUsed,
    nearing_limit: nearingLimit,
    forecast,
    recommendations
  };
}

export function getUsageHistory(subscriptionId) {
  const sub = db.prepare('SELECT id, number FROM subscriptions WHERE id = ?').get(subscriptionId);
  if (!sub) throw new Error(`Subscription #${subscriptionId} not found.`);

  const periods = db.prepare(`
    SELECT * FROM usage_periods
    WHERE subscription_id = ?
    ORDER BY period_start DESC
  `).all(subscriptionId);

  const history = periods.map(p => {
    const usages = db.prepare(`
      SELECT su.*, fc.key as feature_key, fc.name as feature_name, fc.unit, fc.feature_type,
             pf.allowance, pf.is_unlimited
      FROM subscription_usage su
      JOIN feature_catalog fc ON su.feature_id = fc.id
      LEFT JOIN subscriptions s ON su.subscription_id = s.id
      LEFT JOIN plan_features pf ON s.plan_id = pf.plan_id AND pf.feature_id = su.feature_id
      WHERE su.subscription_id = ? AND su.period_id = ?
    `).all(subscriptionId, p.id);

    const charges = db.prepare(`
      SELECT uc.*, fc.name as feature_name, fc.unit
      FROM usage_charges uc
      JOIN feature_catalog fc ON uc.feature_id = fc.id
      WHERE uc.subscription_id = ? AND uc.period_id = ?
    `).all(subscriptionId, p.id);

    return {
      period: p,
      usages,
      charges
    };
  });

  return { subscription: sub, history };
}

export function getAlerts(subscriptionId, filters = {}) {
  const { is_read, limit = 50 } = filters;
  let query = `
    SELECT ua.*, fc.name as feature_name, fc.key as feature_key, fc.unit
    FROM usage_alerts ua
    JOIN feature_catalog fc ON ua.feature_id = fc.id
    WHERE ua.subscription_id = ?
  `;
  const params = [subscriptionId];

  if (is_read !== undefined && is_read !== null) {
    query += ' AND ua.is_read = ?';
    params.push(Number(is_read));
  }

  query += ' ORDER BY ua.id DESC LIMIT ?';
  params.push(Number(limit));

  return db.prepare(query).all(...params);
}

export function markAlertRead(alertId, subscriptionId) {
  const alert = db.prepare('SELECT * FROM usage_alerts WHERE id = ?').get(alertId);
  if (!alert) {
    throw new Error('Alert not found.');
  }

  if (alert.subscription_id !== Number(subscriptionId)) {
    throw new Error('Access denied to alert.');
  }

  db.prepare('UPDATE usage_alerts SET is_read = 1 WHERE id = ?').run(alertId);
  return { success: true, id: alertId };
}

export function getCharges(subscriptionId) {
  const charges = db.prepare(`
    SELECT uc.*, fc.name as feature_name, fc.key as feature_key, fc.unit,
           up.period_start, up.period_end
    FROM usage_charges uc
    JOIN feature_catalog fc ON uc.feature_id = fc.id
    JOIN usage_periods up ON uc.period_id = up.id
    WHERE uc.subscription_id = ?
    ORDER BY uc.id DESC
  `).all(subscriptionId);

  const totalPending = charges.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

  return {
    charges,
    total_pending_amount: Number(totalPending.toFixed(2))
  };
}

