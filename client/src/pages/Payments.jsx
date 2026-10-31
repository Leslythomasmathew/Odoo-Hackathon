import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { CreditCard, Search, DollarSign, Clock, AlertTriangle, Plus } from 'lucide-react';

export function Payments() {
  const { authFetch, user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (methodFilter) params.append('method', methodFilter);
      if (search) params.append('search', search);

      const [pData, invData] = await Promise.all([
        authFetch(`/api/payments?${params.toString()}`),
        authFetch('/api/invoices?status=confirmed')
      ]);

      setPayments(pData.payments || []);
      setTotal(pData.total || 0);
      setUnpaidInvoices(invData.invoices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [methodFilter, search]);

  const methods = ['All Methods', 'Credit Card', 'Bank Transfer', 'PayPal', 'Cash'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>Payments & Collections</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log, reconcile, and match payments directly against billed invoices.
          </p>
        </div>

        {unpaidInvoices.length > 0 && (
          <button
            onClick={() => setSelectedInvoice(unpaidInvoices[0])}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Payment</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by invoice #, customer, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50/50"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value === 'All Methods' ? '' : e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
          >
            {methods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{payments.length}</span> recorded payments
        </p>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No payment receipts found</p>
            <p className="text-xs text-slate-400">No payments match your current search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Payment Ref #</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Note / Memo</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      PAY-{String(p.id).padStart(5, '0')}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        to={`/invoices/${p.invoice_id}`}
                        className="font-mono font-bold text-primary-600 hover:underline"
                      >
                        {p.invoice_number}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{p.customer_name}</p>
                      {p.customer_company && (
                        <p className="text-[11px] text-slate-500">{p.customer_company}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {p.method}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {p.payment_date}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                      {p.note || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                      +${Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <RecordPaymentModal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onPaymentRecorded={loadPayments}
        />
      )}
    </div>
  );
}
