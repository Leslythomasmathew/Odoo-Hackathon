import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Phone, User, RefreshCw } from 'lucide-react';

export function NotifyCustomerModal({ isOpen, onClose, invoice, initialType = 'invoice_due', onSent }) {
  const { authFetch } = useAuth();
  const [type, setType] = useState(initialType);
  const channel = 'email';
  const [preview, setPreview] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (invoice && isOpen) {
      setType(initialType);
      setSuccessMsg('');
      setError('');
      loadPreview(initialType);
    }
  }, [invoice, isOpen, initialType]);

  const loadPreview = async (selectedType) => {
    if (!invoice) return;
    setLoadingPreview(true);
    setError('');
    try {
      const data = await authFetch('/api/notifications/preview', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id,
          type: selectedType
        })
      });
      setPreview(data);
      setCustomSubject(data.subject);
    } catch (err) {
      setError(err.message || 'Failed to generate message preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    loadPreview(newType);
  };

  const handleSend = async () => {
    if (!invoice) return;
    setSending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await authFetch('/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: invoice.id,
          type,
          channel: 'email',
          custom_subject: customSubject
        })
      });
      setSuccessMsg(res.message || 'Email dispatched successfully!');
      if (onSent) onSent();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to dispatch email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Email Customer • Invoice #${invoice?.number}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Type Selection Bar */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Purpose</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg max-w-sm">
            <button
              type="button"
              onClick={() => handleTypeChange('invoice_due')}
              className={`text-xs py-1.5 px-2 rounded-md font-medium transition ${
                type === 'invoice_due' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Reminder
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('payment_receipt')}
              className={`text-xs py-1.5 px-2 rounded-md font-medium transition ${
                type === 'payment_receipt' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Receipt
            </button>
          </div>
        </div>

        {/* Recipient Details */}
        {preview && (
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span><strong>Customer:</strong> {preview.customer_name} {preview.customer_company ? `(${preview.customer_company})` : ''}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0 font-medium text-indigo-900">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>{preview.recipient_email}</span>
            </div>
          </div>
        )}

        {/* Loading / Error States */}
        {loadingPreview ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
            <span className="text-xs">Preparing email template...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Subject Line</label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-100 p-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 px-1">
                Live HTML Rendered Email
              </div>
              <div className="max-h-80 overflow-y-auto bg-white rounded-lg p-2 border border-slate-200">
                <iframe
                  srcDoc={preview.emailHtml}
                  title="Email Preview"
                  className="w-full h-80 border-0"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || loadingPreview || !preview}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{sending ? 'Sending...' : 'Send Live Email'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
