import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Send, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

export function ChaseReminderModal({ isOpen, onClose, invoice, onChaseSent }) {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!invoice) return null;

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      await authFetch(`/api/payments/chase/${invoice.id}`, { method: 'POST' });
      setSent(true);
      if (onChaseSent) onChaseSent();
    } catch (err) {
      setError(err.message || 'Failed to dispatch reminder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chase Overdue Payment: ${invoice.number}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900">Overdue Reminder Dispatched!</h4>
            <p className="text-xs text-emerald-700">
              Notification and payment link successfully emailed to <strong>{invoice.customer_email}</strong>. Activity logged in audit trail.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Overdue Account Notice</span>
              </div>
              <p className="text-rose-700">
                Invoice <strong className="font-mono">{invoice.number}</strong> was due on <strong>{invoice.due_date}</strong>. Outstanding amount: <strong className="text-rose-900">${Number(invoice.outstanding).toFixed(2)}</strong>.
              </p>
            </div>

            {/* Email Preview */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">To:</span>
                <span className="font-semibold text-slate-800">{invoice.customer_name} &lt;{invoice.customer_email}&gt;</span>
              </div>
              <div>
                <span className="text-slate-500">Subject: </span>
                <span className="font-bold text-slate-800">[Urgent] Payment Reminder: Invoice {invoice.number} for Brightloop Subscription</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 space-y-2">
                <p>Dear {invoice.customer_name},</p>
                <p>
                  This is a friendly reminder that payment for invoice <strong>{invoice.number}</strong> in the amount of <strong>${Number(invoice.outstanding).toFixed(2)}</strong> was due on {invoice.due_date} and is currently outstanding.
                </p>
                <p>
                  To avoid any disruption to your Brightloop services, please settle your account via the customer self-service portal or reply with remittance confirmation.
                </p>
                <p className="pt-1 text-slate-400">Brightloop Software Finance Team</p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Sending Notice...' : 'Send Reminder Now'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
