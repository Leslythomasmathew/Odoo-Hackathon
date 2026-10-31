import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  DollarSign,
  Clock,
  AlertTriangle,
  Repeat,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Reports() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await authFetch(`/api/reports/dashboard?${params.toString()}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Active Subscriptions', data.kpis.activeSubscriptions],
      ['Total Revenue Collected ($)', data.kpis.totalRevenue],
      ['Total Outstanding ($)', data.kpis.totalOutstanding],
      ['Overdue Invoices Count', data.kpis.overdueCount],
      ['Overdue Total Amount ($)', data.kpis.overdueTotalAmount],
      ['Estimated MRR ($)', data.kpis.estimatedMRR],
      ['Estimated ARR ($)', data.kpis.estimatedARR]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `brightloop-financial-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading financial reports...</div>;
  }

  const { kpis, subsByStatus, subsByPlan, overdueInvoices, recentPayments, revenueByMethod } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            <span>Financial Reporting & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated recurring revenue metrics, collection reconciliation, and overdue aging summaries.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Summary CSV</span>
        </button>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filter Date Range:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-slate-50/50"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Single Source of Truth: Automated database aggregation
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Subscriptions"
          value={kpis.activeSubscriptions}
          subtitle="Currently live & billing"
          icon={Repeat}
          color="emerald"
        />
        <StatsCard
          title="Revenue Collected"
          value={`$${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Received in bank / gateway"
          icon={DollarSign}
          color="primary"
        />
        <StatsCard
          title="Outstanding Owed"
          value={`$${kpis.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Awaiting customer settlement"
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Overdue Receivables"
          value={`$${kpis.overdueTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`${kpis.overdueCount} invoices past terms`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Overdue Aging Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Overdue Invoices Aging Report</span>
          </h3>
          <Link to="/invoices?overdue_only=true" className="text-xs font-semibold text-primary-600 hover:underline">
            Manage in Invoices
          </Link>
        </div>

        <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 text-right">Invoice Total</th>
                <th className="py-2.5 px-4 text-right">Paid to Date</th>
                <th className="py-2.5 px-4 text-right">Overdue Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overdueInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    No overdue invoices currently.
                  </td>
                </tr>
              ) : (
                overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      <Link to={`/invoices/${inv.id}`}>{inv.number}</Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.customer_name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">{inv.due_date}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">${Number(inv.total).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600">${Number(inv.paid_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-600 text-sm">
                      ${Number(inv.outstanding).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
