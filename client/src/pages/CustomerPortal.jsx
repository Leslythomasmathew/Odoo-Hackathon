import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { ViewNotificationModal } from '../components/ViewNotificationModal';
import { CustomerSubscribeModal } from '../components/CustomerSubscribeModal';
import {
  UserCircle,
  Repeat,
  FileText,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Pause,
  Play,
  RotateCw,
  Mail,
  MessageSquare,
  Bell,
  Eye,
  Plus,
  Sparkles
} from 'lucide-react';

export function CustomerPortal() {
  const { user, authFetch } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'messages'
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, invData, notifData] = await Promise.all([
        authFetch('/api/subscriptions'),
        authFetch('/api/invoices'),
        authFetch('/api/notifications')
      ]);
      setSubscriptions(subData.subscriptions || []);
      setInvoices(invData.invoices || []);
      setNotifications(notifData.notifications || []);
      setUnreadCount(notifData.unread_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNotification = async (notif) => {
    setActiveNotification(notif);
    if (notif.status !== 'read') {
      try {
        await authFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSelfServeTransition = async (subId, action) => {
    try {
      await authFetch(`/api/subscriptions/${subId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading your account portal...</div>;
  }

  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled' && inv.outstanding > 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-900 to-indigo-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h1>
            <p className="text-xs text-primary-200 mt-0.5">
              Customer Self-Service Portal • {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Subscriptions & Invoices</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'messages'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Messages & Receipts</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Unpaid Invoices Alert Banner */}
          {unpaidInvoices.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    You have {unpaidInvoices.length} outstanding invoice{unpaidInvoices.length > 1 ? 's' : ''} awaiting payment
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Pay online securely with zero delays to maintain continuous service.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentInvoice(unpaidInvoices[0])}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
              >
                Pay Now (${unpaidInvoices[0].outstanding.toFixed(2)})
              </button>
            </div>
          )}

          {/* My Subscriptions Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-primary-600" />
                  <span>My Active Subscriptions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Your contracted software licenses and services</p>
              </div>

              <button
                type="button"
                onClick={() => setSubscribeModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Subscribe to a Product</span>
              </button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl space-y-3 bg-slate-50/50">
                <Sparkles className="w-8 h-8 mx-auto text-primary-500" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">No Active Subscriptions Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Select a product and plan to activate your license. Instant confirmation will be sent directly to your email and phone!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscribeModalOpen(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Browse Catalog & Subscribe Now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary-600 text-sm">{sub.number}</span>
                        <StatusBadge status={sub.status} />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">{sub.plan_name}</p>
                      <p className="text-slate-400 text-[11px]">
                        Recurring: <strong className="text-slate-700">${Number(sub.total_recurring_amount).toFixed(2)}</strong> / {sub.billing_period}
                        {sub.next_billing_date && ` • Next Renewal: ${sub.next_billing_date}`}
                      </p>
                    </div>

                  {/* Self-service management buttons */}
                  <div className="flex items-center gap-2">
                    {sub.status === 'active' && sub.pausable === 1 && (
                      <button
                        onClick={() => handleSelfServeTransition(sub.id, 'pause')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold"
                      >
                        Pause Subscription
                      </button>
                    )}

                    {sub.status === 'paused' && (
                      <button
                        onClick={() => handleSelfServeTransition(sub.id, 'resume')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold"
                      >
                        Resume
                      </button>
                    )}

                    {sub.status === 'active' && sub.renewable === 1 && (
                      <button
                        onClick={() => handleSelfServeTransition(sub.id, 'renew')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
                      >
                        Renew
                      </button>
                    )}

                    <Link
                      to={`/subscriptions/${sub.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Invoices & Receipts Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>My Invoices & Receipts</span>
              </h3>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600">
                        <Link to={`/invoices/${inv.id}`}>{inv.number}</Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inv.billing_period_start} → {inv.billing_period_end}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{inv.due_date}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">${Number(inv.total).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">${Number(inv.paid_amount || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={inv.status} isOverdue={inv.is_overdue} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.outstanding > 0 && inv.status !== 'cancelled' && (
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                            >
                              Pay Online
                            </button>
                          )}
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Print / View"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Messages & Receipts View */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-600" />
                <span>Inbox • Payment Receipts & Due Alerts</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All official billing notices, payment receipts, and payment reminders sent via Email.
              </p>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Mail className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <span>No notifications or receipts yet.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    notif.status !== 'read' ? 'bg-primary-50/40 hover:bg-primary-50/70' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        notif.type === 'payment_receipt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {notif.type.replace('_', ' ')}
                      </span>
                      {notif.status !== 'read' && (
                        <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {notif.subject}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Dispatched on {notif.sent_at} • Delivered to: {notif.recipient_email}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notif)}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Receipt / Notice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentInvoice && (
        <RecordPaymentModal
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          invoice={paymentInvoice}
          onPaymentRecorded={loadData}
        />
      )}

      {/* View Notification Details Modal */}
      {activeNotification && (
        <ViewNotificationModal
          isOpen={!!activeNotification}
          onClose={() => setActiveNotification(null)}
          notification={activeNotification}
        />
      )}

      {/* Customer Subscribe Modal */}
      <CustomerSubscribeModal
        isOpen={subscribeModalOpen}
        onClose={() => setSubscribeModalOpen(false)}
        onSubscribed={loadData}
      />
    </div>
  );
}
