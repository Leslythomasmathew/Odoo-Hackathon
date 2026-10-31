import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';

export function seedData(isStressTest = false) {
  initDatabase();

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('BrightloopAdmin2026!', salt);
  const staffHash = bcrypt.hashSync('BrightloopStaff2026!', salt);
  const customerHash = bcrypt.hashSync('CustomerAcme2026!', salt);
  const customer2Hash = bcrypt.hashSync('CustomerRetail2026!', salt);
  const customer3Hash = bcrypt.hashSync('CustomerBakery2026!', salt);

  // Clear existing for a clean, deterministic seed
  db.exec('DELETE FROM activity_logs');
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM invoice_lines');
  db.exec('DELETE FROM invoices');
  db.exec('DELETE FROM subscription_lines');
  db.exec('DELETE FROM subscriptions');
  db.exec('DELETE FROM quotation_template_lines');
  db.exec('DELETE FROM quotation_templates');
  db.exec('DELETE FROM discounts');
  db.exec('DELETE FROM plans');
  db.exec('DELETE FROM tax_rules');
  db.exec('DELETE FROM product_variants');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM customers');
  db.exec('DELETE FROM users');

  // 1. Users (Admin, Staff, Customers)
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);

  const adminUser = insertUser.run('admin@brightloop.com', adminHash, 'Sarah Jenkins (Admin)', 'admin');
  const staffUser = insertUser.run('staff@brightloop.com', staffHash, 'Marcus Vance (Staff)', 'staff');
  const custUser1 = insertUser.run('customer@acmecorp.com', customerHash, 'Alex Rivera', 'customer');
  const custUser2 = insertUser.run('sarah@retailflow.io', customer2Hash, 'Sarah Connor', 'customer');
  const custUser3 = insertUser.run('liam@cornerstonebakery.com', customer3Hash, 'Liam Murphy', 'customer');

  // 2. Customers (Small shops to large enterprises, Section 2.1)
  const insertCustomer = db.prepare(`
    INSERT INTO customers (user_id, name, email, phone, company, billing_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Large Enterprise on yearly contract
  const acmeCust = insertCustomer.run(
    Number(custUser1.lastInsertRowid),
    'Alex Rivera',
    'customer@acmecorp.com',
    '+1 (555) 234-5678',
    'Acme Global Enterprises',
    '100 Innovation Way, Suite 400, San Francisco, CA 94107'
  );

  // Mid-sized company on annual plan with Odoo sync
  const retailCust = insertCustomer.run(
    Number(custUser2.lastInsertRowid),
    'Sarah Connor',
    'sarah@retailflow.io',
    '+1 (555) 987-6543',
    'RetailFlow Technologies',
    '742 Evergreen Terrace, Seattle, WA 98101'
  );

  // Small local shop on monthly plan (Section 2.1)
  const bakeryCust = insertCustomer.run(
    Number(custUser3.lastInsertRowid),
    'Liam Murphy',
    'liam@cornerstonebakery.com',
    '+1 (555) 123-9876',
    'Cornerstone Artisan Bakery',
    '12 Market Street, Boston, MA 02108'
  );

  // Growing media agency
  const nexusCust = insertCustomer.run(
    null,
    'David Chen',
    'david.chen@nexusmedia.com',
    '+1 (555) 345-6789',
    'Nexus Media Group',
    '500 5th Avenue, New York, NY 10110'
  );

  // Small boutique florist on monthly plan
  const floristCust = insertCustomer.run(
    null,
    'Chloe Bennett',
    'chloe@bloomflowers.com',
    '+1 (555) 888-4321',
    'Bloom Florist Studio',
    '88 Blossom Lane, Portland, OR 97201'
  );

  // 3. Tax Rules (Admin created, INV-3)
  const insertTax = db.prepare('INSERT INTO tax_rules (name, rate, is_active) VALUES (?, ?, ?)');
  const vat10 = insertTax.run('Standard VAT (10%)', 10.0, 1);
  const tax5 = insertTax.run('State Sales Tax (5%)', 5.0, 1);
  const zeroTax = insertTax.run('Zero Rated Export (0%)', 0.0, 1);

  // 4. Products & Variants (PROD-1 to PROD-3)
  const insertProduct = db.prepare(`
    INSERT INTO products (name, type, sales_price, cost_price, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const crmProd = insertProduct.run('Brightloop CRM Core', 'Software', 1200.0, 250.0, 'Full lead management, pipeline forecasting, contact tracking and sales automation');
  const analyticsProd = insertProduct.run('Brightloop Analytics Suite', 'Software', 800.0, 150.0, 'Real-time telemetry, cohort retention, and executive BI dashboards');
  const odooProd = insertProduct.run('Odoo Integration Connector', 'Add-on', 450.0, 50.0, 'Bi-directional ERP synchronization module with custom field mappings');
  const supportProd = insertProduct.run('24/7 Priority Support SLA', 'Service', 350.0, 100.0, 'Dedicated account manager with guaranteed 15-minute response SLA');
  const storageProd = insertProduct.run('Cloud Storage Pack (1TB)', 'Add-on', 100.0, 20.0, 'Encrypted multi-region object storage bundle with daily snapshots');

  // Insert Variants (PROD-2, PROD-3)
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, attribute, value, extra_price)
    VALUES (?, ?, ?, ?)
  `);

  // Odoo variant with extra price of 560 as explicitly required in the spec!
  insertVariant.run(Number(odooProd.lastInsertRowid), 'Brand', 'Odoo Enterprise', 560.0);
  insertVariant.run(Number(odooProd.lastInsertRowid), 'Brand', 'Standard Community', 0.0);

  // Storage variants
  insertVariant.run(Number(storageProd.lastInsertRowid), 'Storage Tier', 'Ultra NVMe Flash', 80.0);
  insertVariant.run(Number(storageProd.lastInsertRowid), 'Storage Tier', 'Standard SSD', 0.0);

  // CRM deployment variants
  insertVariant.run(Number(crmProd.lastInsertRowid), 'Deployment', 'Dedicated Private VPC', 300.0);
  insertVariant.run(Number(crmProd.lastInsertRowid), 'Deployment', 'Multi-Tenant Cloud', 0.0);

  // 5. Plans (PLAN-1 to PLAN-4)
  const insertPlan = db.prepare(`
    INSERT INTO plans (name, price, billing_period, min_quantity, available_from, available_to, auto_close, closable, pausable, renewable)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const planStarter = insertPlan.run('Starter Growth Monthly', 299.0, 'monthly', 1, '2026-01-01', '2028-12-31', 0, 1, 1, 1);
  const planProYearly = insertPlan.run('Professional Yearly', 2999.0, 'yearly', 1, '2026-01-01', '2028-12-31', 0, 1, 1, 1);
  const planEnterprise = insertPlan.run('Enterprise Scale Yearly', 9500.0, 'yearly', 5, '2026-01-01', '2028-12-31', 0, 1, 1, 1);
  const planSprintWeekly = insertPlan.run('Agile Sprint Weekly', 99.0, 'weekly', 1, '2026-01-01', '2028-12-31', 0, 1, 1, 1);
  const planSandboxDaily = insertPlan.run('Sandbox Test Daily', 15.0, 'daily', 1, '2026-01-01', '2028-12-31', 1, 1, 0, 0);

  // 6. Discounts (created by admin only, DISC-1 to DISC-8)
  const insertDiscount = db.prepare(`
    INSERT INTO discounts (code, name, type, value, min_purchase, min_quantity, start_date, end_date, usage_limit, times_used, scope, target_product_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const discVolume = insertDiscount.run('VOLUME10', 'Volume Discount 10%', 'percentage', 10.0, 0, 3, '2026-01-01', '2027-12-31', 100, 8, 'whole_subscription', null, 1);
  const discFixed50 = insertDiscount.run('WELCOME50', 'New Customer $50 Off', 'fixed', 50.0, 500.0, 0, '2026-01-01', '2027-12-31', 50, 4, 'whole_subscription', null, 1);
  const discOdoo = insertDiscount.run('ODOOBOOST', 'Odoo Connector $100 Off', 'fixed', 100.0, 0, 1, '2026-01-01', '2027-12-31', 30, 2, 'specific_products', Number(odooProd.lastInsertRowid), 1);
  // Expired discount for testing auto-stop (DISC-8)
  insertDiscount.run('EXPIRED20', 'Past Promotional 20%', 'percentage', 20.0, 0, 0, '2025-01-01', '2025-12-31', 10, 10, 'whole_subscription', null, 1);

  // 7. Quotation Templates (QT-1 to QT-3)
  const insertTemplate = db.prepare(`
    INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
    VALUES (?, ?, ?, ?)
  `);

  const tplStandard = insertTemplate.run('Standard Growth Pack Template', Number(planStarter.lastInsertRowid), 30, 'Recommended for small shops and growing software teams up to 20 seats');
  const tplEnterprise = insertTemplate.run('Enterprise Odoo Suite Template', Number(planProYearly.lastInsertRowid), 45, 'Complete ERP synchronization connector and high-priority SLA bundle');

  const insertTemplateLine = db.prepare(`
    INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, unit_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertTemplateLine.run(Number(tplStandard.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 1, 1200.0);
  insertTemplateLine.run(Number(tplStandard.lastInsertRowid), Number(supportProd.lastInsertRowid), null, 1, 350.0);

  const odooVariant = db.prepare("SELECT id FROM product_variants WHERE value = 'Odoo Enterprise'").get();
  insertTemplateLine.run(Number(tplEnterprise.lastInsertRowid), Number(analyticsProd.lastInsertRowid), null, 2, 800.0);
  insertTemplateLine.run(Number(tplEnterprise.lastInsertRowid), Number(odooProd.lastInsertRowid), odooVariant ? odooVariant.id : null, 1, 1010.0);
  insertTemplateLine.run(Number(tplEnterprise.lastInsertRowid), Number(supportProd.lastInsertRowid), null, 1, 350.0);

  // 8. Seed Subscriptions across all statuses (SUB-1 to SUB-6)
  const insertSub = db.prepare(`
    INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status, next_billing_date, auto_close, closable, pausable, renewable, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubLine = db.prepare(`
    INSERT INTO subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price, tax_id, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Sub 1: Active Monthly for Acme Corp (Large Enterprise)
  const sub1 = insertSub.run(
    'SUB-2026-0001',
    Number(acmeCust.lastInsertRowid),
    Number(planStarter.lastInsertRowid),
    '2026-09-01',
    '2027-09-01',
    'Net 30',
    'active',
    '2026-11-01',
    0, 1, 1, 1,
    'Key enterprise client on monthly auto-billing'
  );
  insertSubLine.run(Number(sub1.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 2, 1200.0, Number(vat10.lastInsertRowid), 2400.0);
  insertSubLine.run(Number(sub1.lastInsertRowid), Number(supportProd.lastInsertRowid), null, 1, 350.0, Number(vat10.lastInsertRowid), 350.0);

  // Sub 2: Active Yearly for RetailFlow with Odoo variant (+560)
  const sub2 = insertSub.run(
    'SUB-2026-0002',
    Number(retailCust.lastInsertRowid),
    Number(planProYearly.lastInsertRowid),
    '2026-08-15',
    '2027-08-15',
    'Immediate',
    'active',
    '2026-10-15', // Due for billing!
    0, 1, 1, 1,
    'Annual contract with Odoo enterprise synchronization'
  );
  insertSubLine.run(Number(sub2.lastInsertRowid), Number(analyticsProd.lastInsertRowid), null, 3, 800.0, Number(vat10.lastInsertRowid), 2400.0);
  insertSubLine.run(Number(sub2.lastInsertRowid), Number(odooProd.lastInsertRowid), odooVariant ? odooVariant.id : null, 1, 1010.0, Number(vat10.lastInsertRowid), 1010.0);

  // Sub 3: Active Monthly for Small Shop (Cornerstone Bakery)
  const sub3 = insertSub.run(
    'SUB-2026-0003',
    Number(bakeryCust.lastInsertRowid),
    Number(planStarter.lastInsertRowid),
    '2026-09-10',
    '2027-09-10',
    'Net 15',
    'active',
    '2026-11-10',
    0, 1, 1, 1,
    'Small shop plan: single seat CRM Core + Cloud Storage'
  );
  insertSubLine.run(Number(sub3.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 1, 1200.0, Number(tax5.lastInsertRowid), 1200.0);
  insertSubLine.run(Number(sub3.lastInsertRowid), Number(storageProd.lastInsertRowid), null, 1, 100.0, Number(tax5.lastInsertRowid), 100.0);

  // Sub 4: Quotation for Nexus Media
  const sub4 = insertSub.run(
    'SUB-2026-0004',
    Number(nexusCust.lastInsertRowid),
    Number(planEnterprise.lastInsertRowid),
    '2026-11-01',
    '2027-11-01',
    'Net 15',
    'quotation',
    '2026-11-01',
    0, 1, 1, 1,
    'Commercial proposal for 5 enterprise seats + 2 priority SLAs'
  );
  insertSubLine.run(Number(sub4.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 5, 1200.0, Number(tax5.lastInsertRowid), 6000.0);
  insertSubLine.run(Number(sub4.lastInsertRowid), Number(supportProd.lastInsertRowid), null, 2, 350.0, Number(tax5.lastInsertRowid), 700.0);

  // Sub 5: Draft Subscription for Bloom Florist Studio
  const sub5 = insertSub.run(
    'SUB-2026-0005',
    Number(floristCust.lastInsertRowid),
    Number(planStarter.lastInsertRowid),
    '2026-11-05',
    '2027-11-05',
    'Immediate',
    'draft',
    '2026-11-05',
    0, 1, 1, 1,
    'Initial draft proposal being prepared by sales rep'
  );
  insertSubLine.run(Number(sub5.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 1, 1200.0, Number(vat10.lastInsertRowid), 1200.0);

  // Sub 6: Confirmed (awaiting activation)
  const sub6 = insertSub.run(
    'SUB-2026-0006',
    Number(retailCust.lastInsertRowid),
    Number(planStarter.lastInsertRowid),
    '2026-11-01',
    '2027-11-01',
    'Net 30',
    'confirmed',
    '2026-11-01',
    0, 1, 1, 1,
    'Customer confirmed contract, ready to go live'
  );
  insertSubLine.run(Number(sub6.lastInsertRowid), Number(analyticsProd.lastInsertRowid), null, 1, 800.0, Number(vat10.lastInsertRowid), 800.0);

  // Sub 7: Paused Subscription (Customer requested freeze)
  insertSub.run(
    'SUB-2026-0007',
    Number(nexusCust.lastInsertRowid),
    Number(planStarter.lastInsertRowid),
    '2026-05-01',
    '2027-05-01',
    'Immediate',
    'paused',
    '2026-12-01',
    0, 1, 1, 1,
    'Customer paused during seasonal freeze (no billing generated)'
  );

  // Sub 8: Closed Subscription
  insertSub.run(
    'SUB-2026-0008',
    Number(nexusCust.lastInsertRowid),
    Number(planSandboxDaily.lastInsertRowid),
    '2026-01-01',
    '2026-03-01',
    'Immediate',
    'closed',
    null,
    1, 1, 0, 0,
    'Auto-closed sandbox after pilot period ended'
  );

  // 9. Invoices & Lines (INV-1 to INV-6)
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (number, subscription_id, customer_id, billing_period_start, billing_period_end, issue_date, due_date, subtotal, tax_total, discount_total, total, status, sent_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInvLine = db.prepare(`
    INSERT INTO invoice_lines (invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate, tax_amount, discount_amount, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (invoice_id, method, amount, payment_date, note)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Invoice 1: Paid invoice for Acme Corp
  const inv1 = insertInvoice.run(
    'INV-2026-0001',
    Number(sub1.lastInsertRowid),
    Number(acmeCust.lastInsertRowid),
    '2026-09-01',
    '2026-09-30',
    '2026-09-01',
    '2026-10-01',
    2750.0,
    275.0,
    50.0, // WELCOME50 applied automatically
    2975.0,
    'paid',
    '2026-09-01 10:00:00',
    'September 2026 billing run'
  );

  insertInvLine.run(Number(inv1.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 'Brightloop CRM Core (Monthly)', 2, 1200.0, 10.0, 240.0, 50.0, 2590.0);
  insertInvLine.run(Number(inv1.lastInsertRowid), Number(supportProd.lastInsertRowid), null, '24/7 Priority Support SLA', 1, 350.0, 10.0, 35.0, 0.0, 385.0);
  insertPayment.run(Number(inv1.lastInsertRowid), 'Credit Card', 2975.0, '2026-09-03', 'Stripe auto-charge transaction #ch_992178');

  // Invoice 2: Confirmed OVERDUE invoice for RetailFlow! (due date 2026-09-15, partial payment only)
  const inv2 = insertInvoice.run(
    'INV-2026-0002',
    Number(sub2.lastInsertRowid),
    Number(retailCust.lastInsertRowid),
    '2026-08-15',
    '2026-09-14',
    '2026-08-15',
    '2026-09-15', // Past due!
    3410.0,
    341.0,
    0.0,
    3751.0,
    'confirmed',
    '2026-08-15 11:30:00',
    'Annual kickoff invoice - requires chasing'
  );

  insertInvLine.run(Number(inv2.lastInsertRowid), Number(analyticsProd.lastInsertRowid), null, 'Brightloop Analytics Suite', 3, 800.0, 10.0, 240.0, 0.0, 2640.0);
  insertInvLine.run(Number(inv2.lastInsertRowid), Number(odooProd.lastInsertRowid), odooVariant ? odooVariant.id : null, 'Odoo Integration (Brand: Odoo Enterprise +$560)', 1, 1010.0, 10.0, 101.0, 0.0, 1111.0);
  // Partial payment ($1000 of $3751 paid, $2751 remains overdue)
  insertPayment.run(Number(inv2.lastInsertRowid), 'Bank Transfer', 1000.0, '2026-09-10', 'Wire payment installment #1 (ref: WT-4412)');

  // Invoice 3: Current confirmed invoice for Acme Corp
  const inv3 = insertInvoice.run(
    'INV-2026-0003',
    Number(sub1.lastInsertRowid),
    Number(acmeCust.lastInsertRowid),
    '2026-10-01',
    '2026-10-31',
    '2026-10-01',
    '2026-11-01',
    2750.0,
    275.0,
    0.0,
    3025.0,
    'confirmed',
    '2026-10-01 09:15:00',
    'October 2026 billing run'
  );
  insertInvLine.run(Number(inv3.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 'Brightloop CRM Core (Monthly)', 2, 1200.0, 10.0, 240.0, 0.0, 2640.0);
  insertInvLine.run(Number(inv3.lastInsertRowid), Number(supportProd.lastInsertRowid), null, '24/7 Priority Support SLA', 1, 350.0, 10.0, 35.0, 0.0, 385.0);

  // Invoice 4: Paid invoice for Small Shop (Cornerstone Bakery)
  const inv4 = insertInvoice.run(
    'INV-2026-0004',
    Number(sub3.lastInsertRowid),
    Number(bakeryCust.lastInsertRowid),
    '2026-09-10',
    '2026-10-09',
    '2026-09-10',
    '2026-09-25',
    1300.0,
    65.0,
    0.0,
    1365.0,
    'paid',
    '2026-09-10 14:00:00',
    'First month small shop billing'
  );
  insertInvLine.run(Number(inv4.lastInsertRowid), Number(crmProd.lastInsertRowid), null, 'Brightloop CRM Core (Small Shop)', 1, 1200.0, 5.0, 60.0, 0.0, 1260.0);
  insertInvLine.run(Number(inv4.lastInsertRowid), Number(storageProd.lastInsertRowid), null, 'Cloud Storage Pack (1TB)', 1, 100.0, 5.0, 5.0, 0.0, 105.0);
  insertPayment.run(Number(inv4.lastInsertRowid), 'Credit Card', 1365.0, '2026-09-12', 'Square terminal card payment #sq_1882');

  // Invoice 5: Draft invoice waiting for review
  const inv5 = insertInvoice.run(
    'INV-2026-0005',
    Number(sub2.lastInsertRowid),
    Number(retailCust.lastInsertRowid),
    '2026-09-15',
    '2026-10-14',
    '2026-10-31',
    '2026-11-30',
    3410.0,
    341.0,
    0.0,
    3751.0,
    'draft',
    null,
    'Generated by system run, awaiting team verification'
  );
  insertInvLine.run(Number(inv5.lastInsertRowid), Number(analyticsProd.lastInsertRowid), null, 'Brightloop Analytics Suite', 3, 800.0, 10.0, 240.0, 0.0, 2640.0);

  // 10. Activity Logs
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertLog.run('billing_run', 'System Billing Run Executed', 'Processed 4 active subscriptions, generated 1 new draft invoice', null, 'billing', 'System');
  insertLog.run('payment_recorded', 'Payment Received ($2,975.00)', 'Recorded $2,975.00 via Credit Card for INV-2026-0001', Number(inv1.lastInsertRowid), 'invoice', 'Sarah Jenkins');
  insertLog.run('payment_recorded', 'Partial Payment Received ($1,000.00)', 'Recorded wire payment of $1,000.00 for INV-2026-0002', Number(inv2.lastInsertRowid), 'invoice', 'Marcus Vance');
  insertLog.run('chase_sent', 'Overdue Payment Chased', 'Sent overdue notification to sarah@retailflow.io for invoice INV-2026-0002 ($2,751.00 balance)', Number(inv2.lastInsertRowid), 'invoice', 'Marcus Vance');

  console.log('Default Brightloop seed data initialized successfully.');
}

// Function to generate benchmark stress data (1,000+ subscriptions)
export function generateBenchmarkData(count = 1000) {
  initDatabase();
  console.log(`Generating ${count} benchmark subscriptions and related data...`);

  const startTime = Date.now();
  db.exec('BEGIN TRANSACTION;');

  try {
    const plans = db.prepare('SELECT id, billing_period FROM plans').all();
    const products = db.prepare('SELECT id, sales_price FROM products').all();
    const customers = db.prepare('SELECT id FROM customers').all();
    const taxes = db.prepare('SELECT id, rate FROM tax_rules').all();

    const insertSub = db.prepare(`
      INSERT INTO subscriptions (number, customer_id, plan_id, start_date, expiry_date, payment_terms, status, next_billing_date, auto_close, closable, pausable, renewable, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLine = db.prepare(`
      INSERT INTO subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price, tax_id, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const statuses = ['active', 'active', 'active', 'confirmed', 'quotation', 'draft', 'paused', 'closed'];
    const terms = ['Immediate', 'Net 15', 'Net 30', 'Net 60'];

    const baseCount = db.prepare('SELECT COUNT(*) as count FROM subscriptions').get().count;

    for (let i = 1; i <= count; i++) {
      const subNum = `SUB-BENCH-${String(baseCount + i).padStart(5, '0')}`;
      const cust = customers[(i % customers.length)];
      const plan = plans[(i % plans.length)];
      const status = statuses[(i % statuses.length)];
      const term = terms[(i % terms.length)];

      const nextBill = status === 'active' ? '2026-10-31' : '2026-11-15';

      const res = insertSub.run(
        subNum,
        cust.id,
        plan.id,
        '2026-01-01',
        '2027-01-01',
        term,
        status,
        nextBill,
        0, 1, 1, 1,
        'Benchmark load test subscription'
      );

      const subId = Number(res.lastInsertRowid);
      const prod = products[(i % products.length)];
      const tax = taxes[(i % taxes.length)];
      const qty = (i % 5) + 1;
      const amt = qty * prod.sales_price;

      insertLine.run(subId, prod.id, null, qty, prod.sales_price, tax.id, amt);
    }

    db.exec('COMMIT;');
    const elapsed = Date.now() - startTime;
    console.log(`Successfully generated ${count} subscriptions in ${elapsed}ms!`);
    return { success: true, count, elapsedMs: elapsed };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Benchmark generation failed:', err);
    throw err;
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedData();
}
