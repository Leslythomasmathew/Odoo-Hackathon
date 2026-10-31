import { db } from '../db/database.js';

/**
 * Feature Catalog & Plan Entitlements Service
 * Centralized, multi-sector, dynamic catalog management.
 */

export function getFeatureCatalog(filters = {}) {
  const { sector, feature_type, is_active = 1, search } = filters;
  let query = 'SELECT * FROM feature_catalog WHERE 1=1';
  const params = [];

  if (is_active !== undefined && is_active !== null) {
    query += ' AND is_active = ?';
    params.push(Number(is_active));
  }

  if (sector) {
    query += ' AND sector = ?';
    params.push(sector);
  }

  if (feature_type) {
    query += ' AND feature_type = ?';
    params.push(feature_type);
  }

  if (search) {
    query += ' AND (name LIKE ? OR key LIKE ? OR description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY sector ASC, name ASC';
  return db.prepare(query).all(...params);
}

export function getFeatureByKey(key) {
  return db.prepare('SELECT * FROM feature_catalog WHERE key = ?').get(key);
}

export function getFeatureById(id) {
  return db.prepare('SELECT * FROM feature_catalog WHERE id = ?').get(id);
}

export function registerFeature(data) {
  const {
    key,
    name,
    description = '',
    sector = 'general',
    feature_type = 'quantity',
    unit = 'count',
    is_active = 1
  } = data;

  if (!key || !name) {
    throw new Error('Feature key and name are required.');
  }

  const existing = getFeatureByKey(key);
  if (existing) {
    throw new Error(`Feature with key '${key}' already exists.`);
  }

  const result = db.prepare(`
    INSERT INTO feature_catalog (key, name, description, sector, feature_type, unit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(key.trim().toLowerCase(), name.trim(), description.trim(), sector.toLowerCase(), feature_type, unit.toLowerCase(), is_active ? 1 : 0);

  return getFeatureById(Number(result.lastInsertRowid));
}

export function getFeaturesForPlan(planId) {
  return db.prepare(`
    SELECT pf.*,
           fc.key as feature_key,
           fc.name as feature_name,
           fc.description as feature_description,
           fc.sector as feature_sector,
           fc.feature_type,
           fc.unit as feature_unit
    FROM plan_features pf
    JOIN feature_catalog fc ON pf.feature_id = fc.id
    WHERE pf.plan_id = ? AND fc.is_active = 1
    ORDER BY fc.sector ASC, fc.name ASC
  `).all(planId);
}

export function assignFeatureToPlan(planId, featureId, config = {}) {
  const {
    allowance = null,
    is_unlimited = 0,
    overage_allowed = 0,
    overage_rate = 0.0,
    reset_frequency = 'billing_period',
    policy = 'soft_alert'
  } = config;

  const existing = db.prepare('SELECT id FROM plan_features WHERE plan_id = ? AND feature_id = ?').get(planId, featureId);

  if (existing) {
    db.prepare(`
      UPDATE plan_features
      SET allowance = ?,
          is_unlimited = ?,
          overage_allowed = ?,
          overage_rate = ?,
          reset_frequency = ?,
          policy = ?
      WHERE id = ?
    `).run(allowance, is_unlimited ? 1 : 0, overage_allowed ? 1 : 0, Number(overage_rate) || 0, reset_frequency, policy, existing.id);
    return db.prepare('SELECT * FROM plan_features WHERE id = ?').get(existing.id);
  }

  const res = db.prepare(`
    INSERT INTO plan_features (plan_id, feature_id, allowance, is_unlimited, overage_allowed, overage_rate, reset_frequency, policy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(planId, featureId, allowance, is_unlimited ? 1 : 0, overage_allowed ? 1 : 0, Number(overage_rate) || 0, reset_frequency, policy);

  return db.prepare('SELECT * FROM plan_features WHERE id = ?').get(Number(res.lastInsertRowid));
}

