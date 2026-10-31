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

const dbPath = path.join(dataDir, 'brightloop.sqlite');
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

    -- Support Tickets table
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT,
      customer_email TEXT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('billing', 'subscription', 'technical', 'enquiry', 'account', 'other')) DEFAULT 'enquiry',
      priority TEXT NOT NULL CHECK(priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
      status TEXT NOT NULL CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Support Messages table
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      sender_type TEXT NOT NULL CHECK(sender_type IN ('customer', 'bot', 'agent')),
      sender_name TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Support Knowledge Base / FAQ table
    CREATE TABLE IF NOT EXISTS support_faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tags TEXT,
      helpful_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);
  `);
}
