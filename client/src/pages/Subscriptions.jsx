import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { CreateSubscriptionModal } from '../components/CreateSubscriptionModal';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  RotateCw,
  Send
} from 'lucide-react';

export function Subscriptions() {
  const { authFetch, user, isAdmin, isStaff } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [transitioningId, setTransitioningId] = useState(null);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const data = await authFetch(`/api/subscriptions?${params.toString()}`);
      setSubscriptions(data.subscriptions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter, search]);

  const handleTransition = async (subId, action) => {
    setTransitioningId(subId);
    try {
      await authFetch(`/api/subscriptions/${subId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      loadSubscriptions();
    } catch (err) {
      alert(err.message || 'Transition failed');
    } finally {
      setTransitioningId(null);
    }
  };

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Quotations', value: 'quotation' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Drafts', value: 'draft' },
    { label: 'Paused', value: 'paused' },
    { label: 'Closed', value: 'closed' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-primary-600" />
            <span>Subscriptions & Quotations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage contract lifecycles from initial draft quotation through active recurring billing.
          </p>
        </div>

        {user?.role !== 'customer' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription / Quote</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SUB #, customer name, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50/50"
          />
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{subscriptions.length}</span> of {total} subscriptions
        </p>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Repeat className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No subscriptions found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No subscriptions match your current filter criteria. Create a new subscription or switch tabs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan & Term</th>
                  <th className="py-3 px-4 text-right">Recurring Subtotal</th>
                  <th className="py-3 px-4">Next Billing Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  const isTransitioning = transitioningId === sub.id;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Subscription Number */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/subscriptions/${sub.id}`}
                          className="font-mono font-bold text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {sub.number}
                        </Link>
                        <p className="text-[10px] text-slate-400 mt-0.5">Start: {sub.start_date}</p>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{sub.customer_name}</p>
                        {sub.customer_company && (
                          <p className="text-[11px] text-slate-500">{sub.customer_company}</p>
                        )}
                      </td>

                      {/* Plan & Term */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{sub.plan_name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {sub.billing_period} • {sub.payment_terms || 'Immediate'}
                        </p>
                      </td>

                      {/* Recurring Subtotal */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${Number(sub.total_recurring_amount).toFixed(2)}
                      </td>

                      {/* Next Billing Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {sub.status === 'active' ? (
                          <span className="font-semibold text-slate-900">{sub.next_billing_date}</span>
                        ) : sub.status === 'paused' ? (
                          <span className="text-amber-600 font-medium">Paused</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={sub.status} />
                      </td>

                      {/* Lifecycle Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Lifecycle Buttons based on status */}
                          {sub.status === 'draft' && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'send_quote')}
                              className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-colors"
                              title="Transition to Quotation"
                            >
                              Quote
                            </button>
                          )}

                          {sub.status === 'quotation' && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'confirm')}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors"
                              title="Confirm offer"
                            >
                              Confirm
                            </button>
                          )}

                          {sub.status === 'confirmed' && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'activate')}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-colors"
                              title="Activate Subscription"
                            >
                              Activate
                            </button>
                          )}

                          {sub.status === 'active' && sub.pausable === 1 && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'pause')}
                              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition-colors"
                              title="Pause Subscription"
                            >
                              Pause
                            </button>
                          )}

                          {sub.status === 'paused' && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'resume')}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-colors"
                              title="Resume Subscription"
                            >
                              Resume
                            </button>
                          )}

                          {sub.status === 'active' && sub.renewable === 1 && (
                            <button
                              disabled={isTransitioning}
                              onClick={() => handleTransition(sub.id, 'renew')}
                              className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors"
                              title="Renew contract"
                            >
                              Renew
                            </button>
                          )}

                          <Link
                            to={`/subscriptions/${sub.id}`}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            title="View Subscription"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateSubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadSubscriptions}
      />
    </div>
  );
}
