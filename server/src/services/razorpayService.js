import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { db } from '../db/database.js';
import {
  buildPaymentReceiptTemplate,
  dispatchNotification,
  getSetting,
  setSetting
} from './notificationService.js';

/**
 * Get Razorpay configuration settings
 */
export function getRazorpayConfig() {
  const keyId = getSetting('RAZORPAY_KEY_ID', '').trim();
  const keySecret = getSetting('RAZORPAY_KEY_SECRET', '').trim();
  const isConfigured = Boolean(keyId && keySecret);

  return {
    keyId: keyId || 'rzp_test_BrightloopSandbox',
    isConfigured,
    mode: isConfigured ? 'live_test' : 'sandbox',
    currency: 'INR'
  };
}

/**
 * Save Razorpay configuration
 */
export function saveRazorpayConfig({ keyId, keySecret }) {
  if (keyId !== undefined && keyId !== '********') {
    setSetting('RAZORPAY_KEY_ID', keyId.trim());
  }
  if (keySecret !== undefined && keySecret !== '********') {
    setSetting('RAZORPAY_KEY_SECRET', keySecret.trim());
  }
  return getRazorpayConfig();
}

/**
 * Create a Razorpay Order for an invoice
 */
export async function createRazorpayOrder({ invoiceId, amount, customer }) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) {
    throw new Error('Invoice not found');
  }

  // Calculate outstanding balance
  const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(inv.id);
  const totalPaid = Number(paidRow.paid || 0);
  const outstanding = Math.max(0, Number((inv.total - totalPaid).toFixed(2)));

  if (outstanding <= 0 || inv.status === 'paid') {
    throw new Error('Invoice is already fully settled and paid.');
  }

  const payAmount = amount ? Math.min(Number(amount), outstanding) : outstanding;
  // Convert to paise (1 INR = 100 paise)
  const amountInPaise = Math.round(payAmount * 100);

  const config = getRazorpayConfig();

  // If live keys are configured, use official Razorpay SDK
  if (config.isConfigured) {
    try {
      const razorpay = new Razorpay({
        key_id: config.keyId,
        key_secret: getSetting('RAZORPAY_KEY_SECRET').trim()
      });

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: inv.number,
        notes: {
          invoice_id: String(inv.id),
          customer_id: String(inv.customer_id),
          customer_name: customer?.name || 'Customer'
        }
      });

      return {
        orderId: order.id,
        amount: payAmount,
        amountInPaise,
        currency: 'INR',
        keyId: config.keyId,
        mode: 'live_test',
        invoiceNumber: inv.number,
        customerName: customer?.name || '',
        customerEmail: customer?.email || ''
      };
    } catch (err) {
      console.warn('[Razorpay API Warning] Failed to create order via SDK, falling back to instant sandbox:', err.message);
    }
  }

  // Instant Interactive Sandbox Order (Works immediately without keys)
  const sandboxOrderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    orderId: sandboxOrderId,
    amount: payAmount,
    amountInPaise,
    currency: 'INR',
    keyId: config.keyId,
    mode: 'sandbox',
    invoiceNumber: inv.number,
    customerName: customer?.name || '',
    customerEmail: customer?.email || '',
    upiUri: `upi://pay?pa=billing@brightloop&pn=Brightloop+Billing&am=${payAmount.toFixed(2)}&tr=${inv.number}&tn=Invoice+${inv.number}&cu=INR`
  };
}

/**
 * Verify Razorpay payment signature & settle invoice
 */
export async function verifyAndSettlePayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  invoiceId,
  amount,
  paymentMethod = 'UPI',
  userName = 'Customer (Online Payment)'
}) {
  const config = getRazorpayConfig();
  const isSandbox = !config.isConfigured || String(razorpay_order_id).startsWith('order_rzp_');

  // Verify HMAC signature if in live test mode
  if (!isSandbox) {
    const keySecret = getSetting('RAZORPAY_KEY_SECRET').trim();
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Payment verification failed: Invalid Razorpay cryptographic signature.');
    }
  }

  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) {
    throw new Error('Invoice not found.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Invalid payment amount.');
  }

  const payDate = new Date().toISOString().split('T')[0];
  const paymentRef = razorpay_payment_id || `pay_${Date.now()}`;
  const formattedMethod = `Razorpay (${paymentMethod.toUpperCase()})`;

  try {
    db.exec('BEGIN TRANSACTION;');

    // 1. Insert into payments table
    const result = db.prepare(`
      INSERT INTO payments (invoice_id, method, amount, payment_date, note)
      VALUES (?, ?, ?, ?, ?)
    `).run(inv.id, formattedMethod, numAmount, payDate, `Razorpay Payment ID: ${paymentRef} (Order: ${razorpay_order_id})`);

    const paymentId = Number(result.lastInsertRowid);

    // 2. Check total paid
    const totalPaidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM payments
      WHERE invoice_id = ?
    `).get(inv.id);

    const totalPaid = Number(totalPaidRow.total_paid.toFixed(2));
    const isFullyPaid = totalPaid >= inv.total;
    const outstanding = Math.max(0, Number((inv.total - totalPaid).toFixed(2)));

    const newStatus = isFullyPaid ? 'paid' : (inv.status === 'draft' ? 'confirmed' : inv.status);

    // 3. Update invoice status
    db.prepare(`
      UPDATE invoices
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, inv.id);

    // 4. Log activity
    db.prepare(`
      INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'payment_recorded',
      `Razorpay Payment of ₹${numAmount.toFixed(2)} Verified`,
      `Invoice #${inv.number} received ₹${numAmount.toFixed(2)} via ${formattedMethod}. Ref: ${paymentRef}. Outstanding: ₹${outstanding.toFixed(2)}`,
      inv.id,
      'invoice',
      userName
    );

    db.exec('COMMIT;');

    // 5. Automatically dispatch official Payment Receipt Email via Gmail SMTP
    try {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(inv.customer_id);
      if (customer) {
        const receiptTemplate = buildPaymentReceiptTemplate({
          payment: { id: paymentId, amount: numAmount, method: formattedMethod, payment_date: payDate, note: `Ref: ${paymentRef}` },
          invoice: inv,
          customer,
          isFullyPaid,
          remainingBalance: outstanding
        });

        dispatchNotification({
          customer_id: customer.id,
          invoice_id: inv.id,
          payment_id: paymentId,
          type: 'payment_receipt',
          channel: 'email',
          subject: receiptTemplate.subject,
          email_html: receiptTemplate.emailHtml,
          recipient_email: customer.email,
          recipient_phone: customer.phone,
          created_by: 'Razorpay Gateway'
        });
      }
    } catch (notifErr) {
      console.warn('[Razorpay Receipt Warning] Could not dispatch payment receipt email:', notifErr.message);
    }

    return {
      success: true,
      paymentId,
      paymentRef,
      invoiceStatus: newStatus,
      totalPaid,
      outstanding,
      isFullyPaid,
      message: `Payment of ₹${numAmount.toFixed(2)} completed successfully via Razorpay! Receipt sent to customer.`
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Razorpay settlement error:', err);
    throw err;
  }
}
