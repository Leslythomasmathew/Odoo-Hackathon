import { db } from '../db/database.js';

// Calculate billing period end date from start date and period string
export function computePeriodEnd(startDateStr, period) {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return startDateStr;

  if (period === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (period === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (period === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (period === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  // Subtract 1 day for inclusive end date
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Calculate next billing date
export function computeNextBillingDate(currentBillingDateStr, period) {
  const d = new Date(currentBillingDateStr);
  if (isNaN(d.getTime())) return currentBillingDateStr;

  if (period === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (period === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (period === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (period === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

// Calculate due date from issue date and payment terms
export function computeDueDate(issueDateStr, paymentTerms) {
  const d = new Date(issueDateStr);
  if (isNaN(d.getTime())) return issueDateStr;

  switch (paymentTerms) {
    case 'Immediate':
      return issueDateStr;
    case 'Net 15':
      d.setDate(d.getDate() + 15);
      break;
    case 'Net 30':
      d.setDate(d.getDate() + 30);
      break;
    case 'Net 60':
      d.setDate(d.getDate() + 60);
      break;
    default:
      return issueDateStr;
  }
  return d.toISOString().split('T')[0];
}

// Generate unique invoice number: INV-YYYY-XXXX
export function generateInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const pattern = `INV-${currentYear}-%`;
  const lastInv = db.prepare(`
    SELECT number FROM invoices
    WHERE number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(pattern);

  let nextSeq = 1;
  if (lastInv && lastInv.number) {
    const parts = lastInv.number.split('-');
    if (parts.length >= 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  let candidate = `INV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  while (db.prepare('SELECT id FROM invoices WHERE number = ?').get(candidate)) {
    nextSeq++;
    candidate = `INV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }

  return candidate;
}

// Core generation function for a single subscription
export function generateInvoiceForSubscription(subId, options = {}) {
  const {
    billingDate = new Date().toISOString().split('T')[0],
    billingPeriodStart = null,
    initialStatus = 'draft',
    issuedBy = 'System'
  } = options;

  const sub = db.prepare(`
    SELECT s.*, p.name as plan_name, p.billing_period, p.auto_close as plan_auto_close
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(subId);

  if (!sub) {
    throw new Error(`Subscription #${subId} not found.`);
  }

  // Determine period start (handles idempotent re-runs for the same date)
  let periodStart;
  if (billingPeriodStart) {
    periodStart = billingPeriodStart;
  } else if (billingDate && sub.next_billing_date && billingDate < sub.next_billing_date) {
    periodStart = billingDate;
  } else {
    periodStart = sub.next_billing_date || billingDate;
  }

  const periodEnd = computePeriodEnd(periodStart, sub.billing_period);

  // INV-6: Idempotent billing check - nothing billed twice for the same billing period
  const existing = db.prepare(`
    SELECT id, number FROM invoices
    WHERE subscription_id = ? AND billing_period_start = ?
  `).get(sub.id, periodStart);

  if (existing) {
    return {
      skipped: true,
      reason: `Invoice ${existing.number} already generated for period starting ${periodStart}.`,
      invoiceId: existing.id,
      invoiceNumber: existing.number
    };
  }

  // Get lines
  const lines = db.prepare(`
    SELECT sl.*, pr.name as product_name, pv.value as variant_value, pv.extra_price,
           tr.rate as tax_rate
    FROM subscription_lines sl
    JOIN products pr ON sl.product_id = pr.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    LEFT JOIN tax_rules tr ON sl.tax_id = tr.id
    WHERE sl.subscription_id = ?
  `).all(sub.id);

  if (!lines || lines.length === 0) {
    throw new Error(`Subscription #${sub.number} has no product lines to bill.`);
  }

  let subtotal = 0;
  let taxTotal = 0;
  let totalQuantity = 0;

  for (const line of lines) {
    const lineAmt = line.quantity * line.unit_price;
    subtotal += lineAmt;
    totalQuantity += line.quantity;
    if (line.tax_rate) {
      taxTotal += lineAmt * (line.tax_rate / 100);
    }
  }

  // Evaluate applicable discounts (DISC-1 to DISC-8)
  const today = billingDate;
  const eligibleDiscounts = db.prepare(`
    SELECT * FROM discounts
    WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      AND (usage_limit IS NULL OR times_used < usage_limit)
    ORDER BY id ASC
  `).all(today, today);

  let discountTotal = 0;
  let appliedDiscount = null;

  for (const disc of eligibleDiscounts) {
    let qualifies = true;
    if (disc.min_purchase && subtotal < disc.min_purchase) {
      qualifies = false;
    }
    if (disc.min_quantity && totalQuantity < disc.min_quantity) {
      qualifies = false;
    }

    if (qualifies) {
      if (disc.scope === 'whole_subscription') {
        if (disc.type === 'percentage') {
          discountTotal += (subtotal * (disc.value / 100));
        } else {
          discountTotal += disc.value;
        }
        appliedDiscount = disc;
        break; // apply best matching whole discount
      } else if (disc.scope === 'specific_products' && disc.target_product_id) {
        const matchingLine = lines.find(l => l.product_id === disc.target_product_id);
        if (matchingLine) {
          const matchLineAmt = matchingLine.quantity * matchingLine.unit_price;
          if (disc.type === 'percentage') {
            discountTotal += (matchLineAmt * (disc.value / 100));
          } else {
            discountTotal += Math.min(matchLineAmt, disc.value);
          }
          appliedDiscount = disc;
          break;
        }
      }
    }
  }

  discountTotal = Math.min(subtotal, Math.max(0, discountTotal));
  const finalTotal = Math.max(0, Number((subtotal + taxTotal - discountTotal).toFixed(2)));
  const dueDate = computeDueDate(billingDate, sub.payment_terms);
  const invNumber = generateInvoiceNumber();

  // Execute in transaction
  db.exec('BEGIN TRANSACTION;');

  try {
    const invRes = db.prepare(`
      INSERT INTO invoices (
        number, subscription_id, customer_id,
        billing_period_start, billing_period_end,
        issue_date, due_date,
        subtotal, tax_total, discount_total, total,
        status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invNumber,
      sub.id,
      sub.customer_id,
      periodStart,
      periodEnd,
      billingDate,
      dueDate,
      Number(subtotal.toFixed(2)),
      Number(taxTotal.toFixed(2)),
      Number(discountTotal.toFixed(2)),
      finalTotal,
      initialStatus,
      appliedDiscount ? `Auto-applied discount: ${appliedDiscount.name} (${appliedDiscount.code})` : null
    );

    const invoiceId = Number(invRes.lastInsertRowid);

    // Insert invoice lines
    const insertInvLine = db.prepare(`
      INSERT INTO invoice_lines (
        invoice_id, product_id, variant_id, description,
        quantity, unit_price, tax_rate, tax_amount, discount_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of lines) {
      let desc = line.product_name;
      if (line.variant_value) {
        desc += ` (${line.variant_value}${line.extra_price ? ` +$${line.extra_price}` : ''})`;
      }
      const lineSub = line.quantity * line.unit_price;
      const lineTax = line.tax_rate ? (lineSub * (line.tax_rate / 100)) : 0;
      let lineDisc = 0;

      if (appliedDiscount && appliedDiscount.scope === 'specific_products' && appliedDiscount.target_product_id === line.product_id) {
        lineDisc = discountTotal;
      }

      const lineTotal = lineSub + lineTax - lineDisc;

      insertInvLine.run(
        invoiceId,
        line.product_id,
        line.variant_id,
        desc,
        line.quantity,
        line.unit_price,
        line.tax_rate || 0,
        Number(lineTax.toFixed(2)),
        Number(lineDisc.toFixed(2)),
        Number(lineTotal.toFixed(2))
      );
    }

    // Increment discount usage if applied (DISC-5, DISC-8)
    if (appliedDiscount) {
      db.prepare(`
        UPDATE discounts
        SET times_used = times_used + 1
        WHERE id = ?
      `).run(appliedDiscount.id);
    }

    // Advance next_billing_date for the subscription
    const nextDate = computeNextBillingDate(periodStart, sub.billing_period);

    // Check auto_close if plan has auto_close and expiry_date reached
    let nextStatus = sub.status;
    if ((sub.auto_close || sub.plan_auto_close) && sub.expiry_date && nextDate > sub.expiry_date) {
      nextStatus = 'closed';
    }

    db.prepare(`
      UPDATE subscriptions
      SET next_billing_date = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nextDate, nextStatus, sub.id);

    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'invoice_generated',
      `Invoice ${invNumber} Generated`,
      `Auto-generated for period ${periodStart} to ${periodEnd} (Total: $${finalTotal.toFixed(2)})`,
      invoiceId,
      'invoice',
      issuedBy
    );

    db.exec('COMMIT;');

    return {
      skipped: false,
      invoiceId,
      invoiceNumber: invNumber,
      total: finalTotal,
      periodStart,
      periodEnd
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Bulk billing runner for all active subscriptions due
export function runBulkBilling(simulationDateStr = null, issuedBy = 'System Runner') {
  const today = simulationDateStr || new Date().toISOString().split('T')[0];

  // Find all active subscriptions where next_billing_date <= today
  const dueSubscriptions = db.prepare(`
    SELECT s.id, s.number, s.customer_id, s.next_billing_date
    FROM subscriptions s
    WHERE s.status = 'active'
      AND (s.next_billing_date IS NULL OR s.next_billing_date <= ?)
    ORDER BY s.id ASC
  `).all(today);

  const results = {
    simulationDate: today,
    totalFound: dueSubscriptions.length,
    generatedCount: 0,
    skippedCount: 0,
    totalAmountBilled: 0,
    invoices: [],
    errors: []
  };

  for (const sub of dueSubscriptions) {
    try {
      const res = generateInvoiceForSubscription(sub.id, {
        billingDate: today,
        initialStatus: 'draft',
        issuedBy
      });

      if (res.skipped) {
        results.skippedCount++;
      } else {
        results.generatedCount++;
        results.totalAmountBilled += res.total;
        results.invoices.push(res);
      }
    } catch (err) {
      results.errors.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        error: err.message
      });
    }
  }

  results.totalAmountBilled = Number(results.totalAmountBilled.toFixed(2));
  return results;
}
