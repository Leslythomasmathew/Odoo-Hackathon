import React from 'react';
import { Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export function PrintableInvoice({ invoice, onBack }) {
  if (!invoice) return null;

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.is_overdue;

  return (
    <div className="space-y-4">
      {/* Top action bar (hidden during print) */}
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ← Back to List
            </button>
          )}
          <span className="text-sm font-medium text-slate-500">Invoice Print Preview</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Area */}
      <div id="printable-invoice-content" className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm max-w-4xl mx-auto text-slate-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-lg">
                B
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Brightloop</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Subscription Management & Recurring Billing</p>
            <p className="text-xs text-slate-400 mt-1">100 Market Street, Suite 500, San Francisco, CA</p>
            <p className="text-xs text-slate-400">billing@brightloop.com • +1 (800) 555-0199</p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Invoice</h1>
            <p className="text-lg font-mono font-semibold text-primary-600 mt-1">{invoice.number}</p>
            <div className="mt-3 inline-block">
              {isPaid ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PAID IN FULL
                </div>
              ) : isOverdue ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  PAYMENT OVERDUE
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  <Clock className="w-3.5 h-3.5" />
                  STATUS: {invoice.status?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Invoice Meta Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-100 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
            <p className="font-bold text-slate-900 text-base">{invoice.customer_name}</p>
            {invoice.customer_company && (
              <p className="font-medium text-slate-700">{invoice.customer_company}</p>
            )}
            <p className="text-slate-500 mt-1 whitespace-pre-line">
              {invoice.customer_address || 'No physical billing address registered.'}
            </p>
            <p className="text-slate-500 mt-1">{invoice.customer_email}</p>
          </div>

          <div className="sm:text-right space-y-1.5">
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Subscription Ref:</span>
              <span className="font-mono font-semibold text-slate-900">{invoice.subscription_number}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Issue Date:</span>
              <span className="font-semibold text-slate-900">{invoice.issue_date}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Due Date:</span>
              <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>{invoice.due_date}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Billing Period:</span>
              <span className="font-medium text-slate-700">{invoice.billing_period_start} to {invoice.billing_period_end}</span>
            </div>
            <div className="flex justify-between sm:justify-end gap-6">
              <span className="text-slate-500">Payment Terms:</span>
              <span className="font-medium text-slate-700">{invoice.payment_terms || 'Immediate'}</span>
            </div>
          </div>
        </div>

        {/* Product Lines Table */}
        <div className="py-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Tax Rate</th>
                <th className="py-3 pl-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.lines || []).map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3.5 pr-4">
                    <p className="font-semibold text-slate-900">{line.description}</p>
                    {line.variant_value && (
                      <p className="text-xs text-slate-500">Variant: {line.variant_value}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium text-slate-700">{line.quantity}</td>
                  <td className="py-3.5 px-4 text-right text-slate-700">${Number(line.unit_price).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right text-slate-500">{line.tax_rate ? `${line.tax_rate}%` : '0%'}</td>
                  <td className="py-3.5 pl-4 text-right font-semibold text-slate-900">${Number(line.total_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount Applied:</span>
                <span>-${Number(invoice.discount_total).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax Total:</span>
              <span className="font-medium text-slate-900">${Number(invoice.tax_total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
              <span>Grand Total:</span>
              <span className="text-primary-600">${Number(invoice.total).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 border-t border-dashed border-slate-200 pt-2">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-700">${Number(invoice.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1">
              <span>Balance Due:</span>
              <span className={`font-mono ${Number(invoice.outstanding) > 0 ? (isOverdue ? 'text-rose-600' : 'text-slate-900') : 'text-emerald-600'}`}>
                ${Number(invoice.outstanding || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recorded Payments</h4>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 divide-y divide-slate-200/60">
              {invoice.payments.map((p, i) => (
                <div key={p.id || i} className="flex justify-between items-center py-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{p.method}</span>
                    <span className="text-slate-400 ml-2">on {p.payment_date}</span>
                    {p.note && <p className="text-slate-500 italic mt-0.5">{p.note}</p>}
                  </div>
                  <span className="font-mono font-bold text-emerald-700">+${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          <p>Thank you for partnering with Brightloop Software. For billing inquiries, email billing@brightloop.com.</p>
          <p className="mt-1 font-mono text-[10px]">Generated by Brightloop Subscription Engine • System Idempotency Verified</p>
        </div>
      </div>
    </div>
  );
}
