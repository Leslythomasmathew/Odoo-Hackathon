import nodemailer from 'nodemailer';
import { db } from '../db/database.js';

/**
 * Format currency
 */
function formatMoney(amount) {
  return `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get setting from database, falling back to process.env
 */
export function getSetting(key, defaultValue = '') {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
    if (row && row.value !== undefined && row.value !== '') {
      return row.value;
    }
  } catch (e) {
    // DB might not be initialized yet
  }
  return process.env[key] || defaultValue;
}

/**
 * Save setting to database
 */
export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, String(value));
}

/**
 * Get all notification provider settings
 */
export function getAllSettings() {
  const keys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM'
  ];

  const settings = {};
  for (const k of keys) {
    settings[k] = getSetting(k, '');
  }
  return settings;
}

/**
 * Send real email to recipient using Nodemailer
 */
export async function sendRealEmail({ to, subject, html, text = '' }) {
  let host = getSetting('SMTP_HOST');
  let port = Number(getSetting('SMTP_PORT', 587));
  let user = (getSetting('SMTP_USER') || '').trim();
  let pass = (getSetting('SMTP_PASS') || '').trim();
  let from = getSetting('EMAIL_FROM', user ? `Brightloop Billing <${user}>` : 'Brightloop Billing <billing@brightloop.com>');
  let secure = getSetting('SMTP_SECURE', 'false') === 'true' || port === 465;

  // Smart auto-detect for Gmail: ensure correct host, port 465 SSL, and strip spaces from 16-char App Password
  if (user && (user.toLowerCase().includes('@gmail.com') || (host && host.toLowerCase().includes('gmail')))) {
    host = 'smtp.gmail.com';
    port = 465;
    secure = true;
    if (pass) {
      pass = pass.replace(/\s+/g, '');
    }
    if (!from || from.includes('noreply@') || from.includes('billing@brightloop.com')) {
      from = `Brightloop Billing <${user}>`;
    }
  }

  if (host && user && pass) {
    try {
      console.log(`[Email] Connecting to SMTP ${host}:${port} as ${user}...`);
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || subject
      });

      console.log(`[Email] Real email dispatched to ${to}! MessageId: ${info.messageId}`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Email] View online test message at: ${previewUrl}`);
      }
      return { success: true, delivered: true, provider: 'smtp', messageId: info.messageId, previewUrl };
    } catch (err) {
      console.error(`[Email Error] Failed to send via SMTP to ${to}:`, err.message);
      return { success: false, delivered: false, error: err.message };
    }
  } else {
    console.log(`[Email Notice] SMTP not fully configured. Email prepared for ${to}: "${subject}". To deliver to your actual inbox, add your Gmail/SMTP credentials in Settings.`);
    return {
      success: true,
      delivered: false,
      notice: 'SMTP credentials not configured yet. Configure SMTP in Email Gateway Settings to deliver live emails.'
    };
  }
}

/**
 * Send real SMS (Disabled - system uses live Email Gateway)
 */
export async function sendRealSMS() {
  return { success: false, delivered: false, disabled: true, message: 'SMS is disabled. Notifications are delivered via direct Email Gateway.' };
}

/**
 * Common HTML email wrapper with modern styling
 */
function wrapEmailTemplate({ title, preheader, contentHtml, ctaText, ctaUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 28px; text-align: left; color: #ffffff; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; display: inline-flex; align-items: center; gap: 8px; }
    .brand-badge { background: rgba(255,255,255,0.2); font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase; }
    .header h1 { margin: 16px 0 4px 0; font-size: 24px; font-weight: 700; color: #ffffff; }
    .header p { margin: 0; color: #c7d2fe; font-size: 14px; }
    .body { padding: 32px 28px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #64748b; }
    .meta-value { font-weight: 600; color: #0f172a; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table th { text-align: left; padding: 10px; background: #f1f5f9; color: #475569; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
    .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    .total-box { margin-top: 20px; padding: 16px; background: #eef2ff; border-radius: 10px; border: 1px solid #c7d2fe; display: flex; justify-content: space-between; align-items: center; }
    .total-title { font-size: 14px; font-weight: 600; color: #3730a3; }
    .total-amount { font-size: 22px; font-weight: 800; color: #312e81; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-active { background: #e0e7ff; color: #4338ca; }
    .badge-due { background: #fef3c7; color: #b45309; }
    .badge-overdue { background: #fee2e2; color: #b91c1c; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; text-align: center; margin: 20px 0 8px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Brightloop <span class="brand-badge">Billing</span></div>
      <h1>${title}</h1>
      <p>${preheader}</p>
    </div>
    <div class="body">
      ${contentHtml}
      ${ctaText && ctaUrl ? `
        <div style="text-align: center; margin-top: 28px;">
          <a href="${ctaUrl}" class="btn">${ctaText} &rarr;</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>This automated message was sent by Brightloop Subscription Management System.</p>
      <p>&copy; ${new Date().getFullYear()} Brightloop Software Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Subscription Confirmation Template
 */
export function buildSubscriptionConfirmationTemplate({ subscription, plan, customer, lines = [], totalAmount = 0 }) {
  const portalUrl = 'http://localhost:5173/portal';

  const linesHtml = (lines || []).map(l => `
    <tr>
      <td><strong>${l.product_name || 'Product License'}</strong></td>
      <td style="text-align: center;">${l.quantity || 1}</td>
      <td style="text-align: right;">${formatMoney(l.unit_price)}</td>
      <td style="text-align: right;"><strong>${formatMoney(l.amount)}</strong></td>
    </tr>
  `).join('');

  const contentHtml = `
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>${customer.name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Welcome to Brightloop! Your new subscription <strong>${subscription.number}</strong> has been successfully confirmed and activated.
    </p>

    <div class="card">
      <div class="meta-row">
        <span class="meta-label">Contract Number</span>
        <span class="meta-value">${subscription.number}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Plan</span>
        <span class="meta-value">${plan.name}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Billing Cycle</span>
        <span class="meta-value" style="text-transform: capitalize;">${plan.billing_period}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Start Date</span>
        <span class="meta-value">${subscription.start_date}</span>
      </div>
      ${subscription.next_billing_date ? `
        <div class="meta-row">
          <span class="meta-label">Next Renewal / Billing</span>
          <span class="meta-value">${subscription.next_billing_date}</span>
        </div>
      ` : ''}
      <div class="meta-row">
        <span class="meta-label">Status</span>
        <span><span class="badge badge-active">ACTIVE</span></span>
      </div>
    </div>

    ${linesHtml ? `
      <table class="table">
        <thead>
          <tr>
            <th>Subscribed Items</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
    ` : ''}

    <div class="total-box">
      <div>
        <div class="total-title">Recurring Amount</div>
        <div style="font-size: 12px; color: #6366f1;">Per ${plan.billing_period}</div>
      </div>
      <div class="total-amount">${formatMoney(totalAmount || plan.price)}</div>
    </div>
  `;

  const emailHtml = wrapEmailTemplate({
    title: `Subscription Confirmed: ${subscription.number}`,
    preheader: `Your ${plan.name} subscription is now active!`,
    contentHtml,
    ctaText: 'Access Your Customer Portal',
    ctaUrl: portalUrl
  });

  const smsBody = `[Brightloop] Welcome ${customer.name}! Subscription #${subscription.number} (${plan.name}) is now ACTIVE. Recurring amount: ${formatMoney(totalAmount || plan.price)}/${plan.billing_period}. Portal: ${portalUrl}`;
  const subject = `Subscription Confirmed: #${subscription.number} - Welcome to Brightloop!`;

  return { subject, emailHtml, smsBody };
}

/**
 * Generate Invoice Due / Payment Reminder content
 */
export function buildInvoiceReminderTemplate({ invoice, customer, items = [], isOverdue = false }) {
  const portalUrl = 'http://localhost:5173/portal';
  const outstanding = invoice.outstanding !== undefined ? invoice.outstanding : invoice.total;
  const statusBadge = isOverdue
    ? `<span class="badge badge-overdue">OVERDUE</span>`
    : `<span class="badge badge-due">PAYMENT DUE</span>`;

  const itemsRows = (items || []).map(item => `
    <tr>
      <td><strong>${item.description || 'Subscription Line'}</strong></td>
      <td style="text-align: center;">${item.quantity || 1}</td>
      <td style="text-align: right;">${formatMoney(item.unit_price)}</td>
      <td style="text-align: right;"><strong>${formatMoney(item.total_amount)}</strong></td>
    </tr>
  `).join('');

  const contentHtml = `
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>${customer.name}</strong>${customer.company ? ` (${customer.company})` : ''},</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      ${isOverdue 
        ? `This is an urgent notice that invoice <strong>#${invoice.number}</strong> has passed its due date (${invoice.due_date}) and has an outstanding balance of <strong>${formatMoney(outstanding)}</strong>.`
        : `This is a reminder that invoice <strong>#${invoice.number}</strong> for your subscription is due on <strong>${invoice.due_date}</strong>.`}
    </p>

    <div class="card">
      <div class="meta-row">
        <span class="meta-label">Invoice Number</span>
        <span class="meta-value">#${invoice.number}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Status</span>
        <span>${statusBadge}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Issue Date</span>
        <span class="meta-value">${invoice.issue_date}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Due Date</span>
        <span class="meta-value" style="${isOverdue ? 'color: #b91c1c; font-weight: 700;' : ''}">${invoice.due_date}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Billing Period</span>
        <span class="meta-value">${invoice.billing_period_start} &rarr; ${invoice.billing_period_end}</span>
      </div>
    </div>

    ${itemsRows ? `
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    ` : ''}

    <div class="total-box">
      <div>
        <div class="total-title">Total Outstanding Balance</div>
        <div style="font-size: 12px; color: #6366f1;">Invoice Total: ${formatMoney(invoice.total)}</div>
      </div>
      <div class="total-amount">${formatMoney(outstanding)}</div>
    </div>
  `;

  const emailHtml = wrapEmailTemplate({
    title: isOverdue ? `Urgent: Overdue Invoice #${invoice.number}` : `Payment Due: Invoice #${invoice.number}`,
    preheader: `Outstanding balance of ${formatMoney(outstanding)} is due on ${invoice.due_date}`,
    contentHtml,
    ctaText: 'View & Pay Invoice Online',
    ctaUrl: portalUrl
  });

  const smsBody = `[Brightloop Alert] Hi ${customer.name}, invoice #${invoice.number} for ${formatMoney(outstanding)} is ${isOverdue ? 'OVERDUE' : 'due on ' + invoice.due_date}. Pay online here: ${portalUrl}`;

  const subject = isOverdue
    ? `URGENT: Invoice #${invoice.number} Overdue Notice - ${formatMoney(outstanding)} Due`
    : `Payment Reminder: Invoice #${invoice.number} for ${formatMoney(outstanding)} due on ${invoice.due_date}`;

  return { subject, emailHtml, smsBody };
}

/**
 * Generate Payment Receipt Template
 */
export function buildPaymentReceiptTemplate({ payment, invoice, customer, isFullyPaid, remainingBalance }) {
  const portalUrl = 'http://localhost:5173/portal';
  const receiptNum = `RCP-${new Date().getFullYear()}-${String(payment.id).padStart(4, '0')}`;

  const contentHtml = `
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>${customer.name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Thank you for your payment! We have successfully processed your transaction for invoice <strong>#${invoice.number}</strong>.
    </p>

    <div class="card">
      <div class="meta-row">
        <span class="meta-label">Receipt Number</span>
        <span class="meta-value">${receiptNum}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Payment Date</span>
        <span class="meta-value">${payment.payment_date}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Payment Method</span>
        <span class="meta-value">${payment.method}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Invoice Settled</span>
        <span class="meta-value">#${invoice.number}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Invoice Status</span>
        <span>
          ${isFullyPaid 
            ? `<span class="badge badge-paid">FULLY PAID</span>` 
            : `<span class="badge badge-due">PARTIAL PAYMENT</span>`}
        </span>
      </div>
      ${payment.note ? `
        <div class="meta-row">
          <span class="meta-label">Reference Note</span>
          <span class="meta-value">${payment.note}</span>
        </div>
      ` : ''}
    </div>

    <div class="total-box" style="background: #f0fdf4; border-color: #86efac;">
      <div>
        <div class="total-title" style="color: #166534;">Amount Paid</div>
        <div style="font-size: 12px; color: #15803d;">
          ${isFullyPaid ? 'Invoice fully settled' : `Remaining balance: ${formatMoney(remainingBalance)}`}
        </div>
      </div>
      <div class="total-amount" style="color: #166534;">${formatMoney(payment.amount)}</div>
    </div>
  `;

  const emailHtml = wrapEmailTemplate({
    title: `Payment Receipt: ${formatMoney(payment.amount)}`,
    preheader: `Payment received for Invoice #${invoice.number} on ${payment.payment_date}`,
    contentHtml,
    ctaText: 'Access Customer Portal & Invoices',
    ctaUrl: portalUrl
  });

  const smsBody = `[Brightloop Receipt] Payment of ${formatMoney(payment.amount)} received for Invoice #${invoice.number} via ${payment.method}. Remaining balance: ${formatMoney(remainingBalance)}. Thank you!`;
  const subject = `Payment Receipt ${receiptNum} for Invoice #${invoice.number} - ${formatMoney(payment.amount)}`;

  return { subject, emailHtml, smsBody, receiptNum };
}

/**
 * Dispatch and record notification into database AND send real email
 */
export async function dispatchNotification({
  customer_id,
  invoice_id = null,
  payment_id = null,
  subscription_id = null,
  type = 'invoice_due',
  channel = 'email',
  subject,
  email_html,
  sms_body = null,
  recipient_email,
  recipient_phone = null,
  created_by = 'System'
}) {
  const insertStmt = db.prepare(`
    INSERT INTO customer_notifications (
      customer_id, invoice_id, payment_id, subscription_id,
      type, channel, recipient_email, recipient_phone,
      subject, email_html, sms_body, status, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered', datetime('now'))
  `);

  const result = insertStmt.run(
    customer_id,
    invoice_id,
    payment_id,
    subscription_id,
    type,
    channel,
    recipient_email,
    recipient_phone,
    subject,
    email_html,
    sms_body
  );

  const notifId = result.lastInsertRowid;

  // Log to activity log
  db.prepare(`
    INSERT INTO activity_logs (type, title, details, target_id, target_type, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'customer_notified',
    `Notification Dispatched: ${subject}`,
    `Email dispatched to ${recipient_email}`,
    invoice_id || subscription_id || customer_id,
    invoice_id ? 'invoice' : (subscription_id ? 'subscription' : 'customer'),
    created_by
  );

  // Attempt real email dispatch
  if (recipient_email) {
    sendRealEmail({
      to: recipient_email,
      subject,
      html: email_html
    }).catch(e => console.error('Real email dispatch background error:', e));
  }

  return db.prepare('SELECT * FROM customer_notifications WHERE id = ?').get(notifId);
}

/**
 * Automated due date reminder scanner
 * Automatically sends payment reminders 7, 3, 1, or 0 days before invoice due date.
 */
export async function checkAndSendAutomatedDueReminders() {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  const openInvoices = db.prepare(`
    SELECT i.*, c.email as customer_email, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.status NOT IN ('paid', 'cancelled')
  `).all();

  const dispatched = [];

  for (const inv of openInvoices) {
    const paidRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = ?').get(inv.id);
    const outstanding = Math.max(0, Number((inv.total - Number(paidRow.paid || 0)).toFixed(2)));
    if (outstanding <= 0) continue;

    inv.outstanding = outstanding;

    const dueDate = new Date(inv.due_date);
    const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

    // Remind if due date is within 7 days, 3 days, 1 day, or today
    if ([7, 3, 1, 0].includes(diffDays)) {
      // Check if already sent a reminder today
      const alreadySent = db.prepare(`
        SELECT id FROM customer_notifications
        WHERE invoice_id = ? AND type = 'invoice_due' AND date(sent_at) = date('now')
      `).get(inv.id);

      if (!alreadySent && inv.customer_email) {
        const items = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(inv.id);
        const reminder = buildInvoiceReminderTemplate({
          invoice: inv,
          customer: { name: inv.customer_name, email: inv.customer_email },
          items,
          isOverdue: false
        });

        const notif = await dispatchNotification({
          customer_id: inv.customer_id,
          invoice_id: inv.id,
          type: 'invoice_due',
          channel: 'email',
          subject: reminder.subject,
          email_html: reminder.emailHtml,
          recipient_email: inv.customer_email,
          created_by: 'Automated Due Scheduler'
        });

        dispatched.push({
          invoice_number: inv.number,
          customer_email: inv.customer_email,
          due_date: inv.due_date,
          days_until_due: diffDays,
          notification_id: notif.id
        });
      }
    }
  }

  return { count: dispatched.length, dispatched };
}
