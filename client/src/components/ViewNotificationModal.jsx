import React from 'react';
import { Modal } from './Modal';
import { Mail, MessageSquare, Calendar, User, CheckCircle2, Phone } from 'lucide-react';

export function ViewNotificationModal({ isOpen, onClose, notification }) {
  if (!notification) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={notification.subject || 'Message Details'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Header Metadata */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-800 text-sm">
              {notification.subject}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              notification.type === 'payment_receipt'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {notification.type.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {notification.sent_at}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {notification.recipient_email}
            </span>
            {notification.recipient_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {notification.recipient_phone}
              </span>
            )}
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
            </span>
          </div>
        </div>

        {/* SMS Preview snippet if exists */}
        {notification.sms_body && (
          <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              SMS Notification Dispatched:
            </div>
            <div className="text-xs text-indigo-950 font-mono bg-white p-2.5 rounded-lg border border-indigo-200 shadow-sm leading-relaxed">
              {notification.sms_body}
            </div>
          </div>
        )}

        {/* Rendered HTML Email Preview */}
        {notification.email_html && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Official Email Document</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Brightloop Postmark Engine</span>
            </div>
            <iframe
              srcDoc={notification.email_html}
              title="Notification Content"
              className="w-full h-96 border-0"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
