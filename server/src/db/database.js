import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilename = process.env.NODE_ENV === 'test' ? 'brightloop.test.sqlite' : 'brightloop.sqlite';
const dbPath = path.join(dataDir, dbFilename);
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

export function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'customer')),
      reset_token TEXT,
      reset_token_expiry TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      company TEXT,
      billing_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      sales_price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Product variants
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      attribute TEXT NOT NULL,
      value TEXT NOT NULL,
      extra_price REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Tax Rules
    CREATE TABLE IF NOT EXISTS tax_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Plans table
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      billing_period TEXT NOT NULL CHECK(billing_period IN ('daily', 'weekly', 'monthly', 'yearly')),
      min_quantity INTEGER NOT NULL DEFAULT 1,
      available_from TEXT,
      available_to TEXT,
      auto_close INTEGER NOT NULL DEFAULT 0,
      closable INTEGER NOT NULL DEFAULT 1,
      pausable INTEGER NOT NULL DEFAULT 1,
      renewable INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Quotation Templates
    CREATE TABLE IF NOT EXISTS quotation_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      validity_days INTEGER NOT NULL DEFAULT 30,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Quotation Template Lines
    CREATE TABLE IF NOT EXISTS quotation_template_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      variant_id INTEGER REFERENCES product_variants(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL
    );

    -- Discounts table
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('fixed', 'percentage')),
      value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      min_quantity INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      scope TEXT NOT NULL CHECK(scope IN ('whole_subscription', 'specific_products')),
      target_product_id INTEGER REFERENCES products(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      start_date TEXT NOT NULL,
      expiry_date TEXT,
      payment_terms TEXT NOT NULL DEFAULT 'Immediate',
      status TEXT NOT NULL CHECK(status IN ('draft', 'quotation', 'confirmed', 'active', 'closed', 'paused')) DEFAULT 'draft',
      next_billing_date TEXT,
      auto_close INTEGER NOT NULL DEFAULT 0,
      closable INTEGER NOT NULL DEFAULT 1,
      pausable INTEGER NOT NULL DEFAULT 1,
      renewable INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Subscription Lines
    CREATE TABLE IF NOT EXISTS subscription_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      variant_id INTEGER REFERENCES product_variants(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      tax_id INTEGER REFERENCES tax_rules(id),
      amount REAL NOT NULL
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      billing_period_start TEXT NOT NULL,
      billing_period_end TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_total REAL NOT NULL DEFAULT 0,
      discount_total REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'paid', 'cancelled')) DEFAULT 'draft',
      sent_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(subscription_id, billing_period_start)
    );

    -- Invoice Lines
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      variant_id INTEGER REFERENCES product_variants(id),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Activity / Chasing logs
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      target_id INTEGER,
      target_type TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Customer Notifications / Email Dispatches
    CREATE TABLE IF NOT EXISTS customer_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('invoice_due', 'payment_reminder', 'payment_receipt', 'subscription_renewal', 'general')),
      channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'both')) DEFAULT 'email',
      recipient_email TEXT,
      recipient_phone TEXT,
      subject TEXT NOT NULL,
      email_html TEXT NOT NULL,
      sms_body TEXT,
      status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('sent', 'delivered', 'read')),
      sent_at TEXT DEFAULT (datetime('now')),
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- System Configuration Settings (SMTP, Email gateway, etc.)
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Performance Indexes for sub-second queries with 10,000+ records
    CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_subs_next_billing ON subscriptions(next_billing_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_sub ON invoices(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_notif_customer ON customer_notifications(customer_id);
    CREATE INDEX IF NOT EXISTS idx_notif_invoice ON customer_notifications(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_notif_created ON customer_notifications(created_at);


    -- =========================================================================
    -- SUBSCRIPTION USAGE TRACKING MODULE (ADDITIVE SCHEMA)
    -- =========================================================================

    -- Dynamic Feature Catalog across industry sectors (General, Healthcare, Education, E-commerce, Transportation, etc.)
    CREATE TABLE IF NOT EXISTS feature_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sector TEXT NOT NULL DEFAULT 'general',
      feature_type TEXT NOT NULL CHECK(feature_type IN ('access', 'quantity', 'consumption')),
      unit TEXT NOT NULL DEFAULT 'count',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Plan Features Mapping with entitlements, policies, and overage rates
    CREATE TABLE IF NOT EXISTS plan_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      feature_id INTEGER NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
      allowance REAL,
      is_unlimited INTEGER NOT NULL DEFAULT 0,
      overage_allowed INTEGER NOT NULL DEFAULT 0,
      overage_rate REAL NOT NULL DEFAULT 0.0,
      reset_frequency TEXT NOT NULL DEFAULT 'billing_period' CHECK(reset_frequency IN ('billing_period', 'monthly', 'daily', 'never')),
      policy TEXT NOT NULL DEFAULT 'soft_alert' CHECK(policy IN ('soft_alert', 'hard_limit', 'overage')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(plan_id, feature_id)
    );

    -- Usage Billing Periods (synchronizes with subscription billing cycles)
    CREATE TABLE IF NOT EXISTS usage_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(subscription_id, period_start)
    );

    -- Aggregated Subscription Usage per feature in a period
    CREATE TABLE IF NOT EXISTS subscription_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      feature_id INTEGER NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
      period_id INTEGER REFERENCES usage_periods(id) ON DELETE SET NULL,
      usage_value REAL NOT NULL DEFAULT 0,
      last_recorded_at TEXT DEFAULT (datetime('now')),
      UNIQUE(subscription_id, feature_id, period_id)
    );

    -- Idempotent Real-Time Usage Events (audit trail and time-series analytics)
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT UNIQUE,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      feature_id INTEGER NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
      period_id INTEGER REFERENCES usage_periods(id) ON DELETE SET NULL,
      quantity REAL NOT NULL,
      operation_type TEXT NOT NULL,
      source_ref TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Automated Usage Alerts (50%, 80%, 90%, 100% thresholds, deduplicated per period)
    CREATE TABLE IF NOT EXISTS usage_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      feature_id INTEGER NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
      period_id INTEGER REFERENCES usage_periods(id) ON DELETE SET NULL,
      threshold_percent INTEGER NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical', 'danger')),
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(subscription_id, feature_id, period_id, threshold_percent)
    );

    -- Usage Overage Charges (accumulated overage charges for billing integration)
    CREATE TABLE IF NOT EXISTS usage_charges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      feature_id INTEGER NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
      period_id INTEGER REFERENCES usage_periods(id) ON DELETE SET NULL,
      units_over REAL NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'invoiced', 'paid')),
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(subscription_id, feature_id, period_id)
    );

    -- Performance Indexes for Usage Tracking
    CREATE INDEX IF NOT EXISTS idx_feature_cat_key ON feature_catalog(key);
    CREATE INDEX IF NOT EXISTS idx_feature_cat_sector ON feature_catalog(sector);
    CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
    CREATE INDEX IF NOT EXISTS idx_usage_periods_sub ON usage_periods(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_sub_usage_sub_period ON subscription_usage(subscription_id, period_id);
    CREATE INDEX IF NOT EXISTS idx_usage_events_sub_created ON usage_events(subscription_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_events_idempotency ON usage_events(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_usage_alerts_sub ON usage_alerts(subscription_id, is_read);

  `);
}
