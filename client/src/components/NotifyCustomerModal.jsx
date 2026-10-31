import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Phone, User, RefreshCw } from 'lucide-react';

export function NotifyCustomerModal({ isOpen, onClose, invoice, initialType = 'invoice_due', onSent }) {
  const { authFetch } = useAuth();
  const [type, setType] = useState(initialType);
  const [channel, setChannel] = useState('both');
  const [preview, setPreview] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customSms, setCustomSms] = useState('');
  const [activeTab, setActiveTab] = useState('email');
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
      setCustomSms(data.smsBody);
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
          channel,
          custom_subject: customSubject,
          custom_sms: customSms
        })
      });
      setSuccessMsg(res.message || 'Notification dispatched successfully!');
      if (onSent) onSent();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Notify Customer • Invoice #${invoice?.number}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Type & Channel Selection Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Purpose</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Channels</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setChannel('both')}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition ${
                  channel === 'both' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email + SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition ${
                  channel === 'email' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email Only
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition ${
                  channel === 'sms' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SMS Only
              </button>
            </div>
          </div>
        </div>

        {/* Recipient Details */}
        {preview && (
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span><strong>Customer:</strong> {preview.customer_name} {preview.customer_company ? `(${preview.customer_company})` : ''}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 sm:mt-0">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> {preview.recipient_email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" /> {preview.recipient_phone}
              </span>
            </div>
          </div>
        )}

        {/* Tab Switcher for Preview */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'email'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            HTML Email Preview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sms'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS / Text Message Preview
          </button>
        </div>

        {/* Loading / Error States */}
        {loadingPreview ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
            <span className="text-xs">Preparing email & message template...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : preview ? (
          <div>
            {activeTab === 'email' ? (
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
                    Live HTML Rendered View
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
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMS Message Body ({customSms.length} chars)
                  </label>
                  <textarea
                    rows={3}
                    value={customSms}
                    onChange={(e) => setCustomSms(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>

                {/* Smartphone Preview Mockup */}
                <div className="flex justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-72 bg-slate-900 rounded-3xl p-3 shadow-xl border-4 border-slate-800">
                    <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-4"></div>
                    <div className="text-[10px] text-center text-slate-400 font-semibold mb-3">
                      SMS • {preview.recipient_phone}
                    </div>
                    <div className="bg-primary-600 text-white text-xs p-3 rounded-2xl rounded-tr-sm shadow-md leading-relaxed">
                      {customSms}
                    </div>
                    <div className="text-[9px] text-slate-500 text-right mt-1.5">Now • Delivered</div>
                  </div>
                </div>
              </div>
            )}
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
            <span>{sending ? 'Dispatching...' : `Dispatch via ${channel.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
