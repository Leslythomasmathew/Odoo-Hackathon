import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { CreditCard, AlertCircle } from 'lucide-react';

export function RecordPaymentModal({ isOpen, onClose, invoice, onPaymentRecorded }) {
  const { authFetch } = useAuth();
  const [method, setMethod] = useState('Credit Card');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice) {
      setAmount(invoice.outstanding !== undefined ? String(invoice.outstanding) : String(invoice.total));
      setNote(`Payment for ${invoice.number}`);
      setError('');
    }
  }, [invoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    setLoading(true);
    setError('');

    try {
      await authFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id,
          method,
          amount: parseFloat(amount),
          payment_date: paymentDate,
          note
        })
      });
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (err) {
      setError(err.message || 'Payment recording failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment for ${invoice?.number}`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {invoice && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-800">{invoice.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Total:</span>
              <span className="font-semibold text-slate-800">${Number(invoice.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-primary-700 font-bold">
              <span>Outstanding Balance:</span>
              <span className="font-mono">${Number(invoice.outstanding || invoice.total).toFixed(2)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="Credit Card">Credit Card (Stripe Gateway)</option>
            <option value="Bank Transfer">Bank Wire / ACH Transfer</option>
            <option value="PayPal">PayPal</option>
            <option value="Cash">Cash / Check</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          />
          <p className="text-[11px] text-slate-400 mt-1">Partial payments supported. When balance is $0, status becomes Paid.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
          <input
            type="date"
            required
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Reference / Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Transaction ID, Check #, Memo"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{loading ? 'Processing...' : 'Confirm Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
