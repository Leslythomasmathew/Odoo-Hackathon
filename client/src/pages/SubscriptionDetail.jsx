import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Repeat,
  Calendar,
  DollarSign,
  FileText,
  User,
  ArrowLeft,
  Zap,
  CheckCircle,
  Play,
  Pause,
  RotateCw,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export function SubscriptionDetail() {
  const { id } = useParams();
  const { authFetch, user, isAdmin, isStaff } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/subscriptions/${id}`);
      setData(res.subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTransition = async (action) => {
    try {
      await authFetch(`/api/subscriptions/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Transition failed');
    }
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    setMsg('');
    try {
      const res = await authFetch(`/api/invoices/generate/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          billingDate: data.next_billing_date || new Date().toISOString().split('T')[0]
        })
      });
      setMsg(res.message);
      loadData();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !data) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading subscription #{id}...</div>;
  }

  const steps = ['draft', 'quotation', 'confirmed', 'active', 'closed'];
  const currentStepIdx = steps.indexOf(data.status);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/subscriptions"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={data.status} />
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-black text-slate-900 tracking-tight">{data.number}</span>
            <span className="text-xs text-slate-400 font-medium">• Contract ID #{data.id}</span>
          </div>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            Customer: <span className="text-slate-900 font-bold">{data.customer_name}</span>
            {data.customer_company && <span className="text-slate-500 ml-1">({data.customer_company})</span>}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{data.customer_email}</p>
        </div>

        {/* State Machine Transition Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {data.status === 'draft' && (
            <button
              onClick={() => handleTransition('send_quote')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Send Quotation
            </button>
          )}

          {data.status === 'quotation' && (
            <button
              onClick={() => handleTransition('confirm')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Confirm Acceptance
            </button>
          )}

          {data.status === 'confirmed' && (
            <button
              onClick={() => handleTransition('activate')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Activate Subscription
            </button>
          )}

          {data.status === 'active' && data.pausable === 1 && (
            <button
              onClick={() => handleTransition('pause')}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-colors"
            >
              Pause
            </button>
          )}

          {data.status === 'paused' && (
            <button
              onClick={() => handleTransition('resume')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Resume Billing
            </button>
          )}

          {data.status === 'active' && data.renewable === 1 && (
            <button
              onClick={() => handleTransition('renew')}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
            >
              Renew Term
            </button>
          )}

          {data.status === 'active' && data.closable === 1 && (
            <button
              onClick={() => handleTransition('close')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Close Early
            </button>
          )}

          {data.status === 'active' && (
            <button
              disabled={generating}
              onClick={handleGenerateInvoice}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{generating ? 'Billing...' : 'Bill Next Period'}</span>
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="bg-primary-50 text-primary-900 border border-primary-200 p-3 rounded-xl text-xs font-medium">
          {msg}
        </div>
      )}

      {/* State Machine Flow Visualizer (Section 5.1) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Lifecycle State Machine Flow</h3>
        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
          {steps.map((st, i) => {
            const isDone = currentStepIdx >= i && data.status !== 'paused';
            const isCurrent = data.status === st;

            return (
              <div key={st} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[11px] font-bold mt-2 capitalize ${isCurrent ? 'text-primary-700' : 'text-slate-500'}`}>
                  {st}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contract & Plan Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan & Schedule</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-slate-900">{data.plan_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Period:</span>
              <span className="font-semibold text-slate-800 capitalize">{data.billing_period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Start Date:</span>
              <span className="font-mono text-slate-800">{data.start_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expiry Date:</span>
              <span className="font-mono text-slate-800">{data.expiry_date || 'Ongoing / Indefinite'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Billing:</span>
              <span className="font-mono font-bold text-primary-600">{data.next_billing_date || '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Terms & Permissions</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Terms:</span>
              <span className="font-semibold text-slate-800">{data.payment_terms || 'Immediate'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pausable:</span>
              <span className="font-semibold text-slate-800">{data.pausable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Renewable:</span>
              <span className="font-semibold text-slate-800">{data.renewable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Closable Early:</span>
              <span className="font-semibold text-slate-800">{data.closable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Auto-Close at Expiry:</span>
              <span className="font-semibold text-slate-800">{data.auto_close ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer & Billing Address</h4>
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-900">{data.customer_name}</p>
            {data.customer_company && <p className="font-medium text-slate-700">{data.customer_company}</p>}
            <p className="text-slate-500 whitespace-pre-line mt-1">{data.billing_address || 'No address specified'}</p>
            <p className="text-slate-400 font-mono mt-1">{data.customer_email}</p>
          </div>
        </div>
      </div>

      {/* Product Lines Table (SUB-3) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Contracted Product Lines & Add-ons</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Variant & Adjustments</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Tax Rule</th>
                <th className="py-2.5 px-4 text-right">Recurring Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.lines || []).map((line) => (
                <tr key={line.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{line.product_name}</td>
                  <td className="py-3 px-4 text-slate-500">{line.product_type}</td>
                  <td className="py-3 px-4">
                    {line.variant_value ? (
                      <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-primary-100">
                        {line.variant_value} {line.extra_price ? `(+$${line.extra_price})` : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">Standard</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{line.quantity}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">${Number(line.unit_price).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-500">{line.tax_name || 'No Tax (0%)'}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">${Number(line.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Generated Recurring Invoices</h3>
          <span className="text-xs text-slate-400 font-medium">({data.invoices?.length || 0} invoices)</span>
        </div>

        {data.invoices && data.invoices.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Billing Period</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Outstanding</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-primary-600">
                      <Link to={`/invoices/${inv.id}`}>{inv.number}</Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inv.billing_period_start} to {inv.billing_period_end}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.issue_date}</td>
                    <td className="py-3 px-4 text-slate-600">{inv.due_date}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">${Number(inv.total).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">${Number(inv.outstanding).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-primary-600 hover:text-primary-700 font-bold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3">No invoices generated for this subscription yet.</p>
        )}
      </div>
    </div>
  );
}
