import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { ChaseReminderModal } from '../components/ChaseReminderModal';
import {
  Repeat,
  DollarSign,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowUpRight,
  Send,
  Calendar,
  Sparkles,
  LifeBuoy
} from 'lucide-react';

export function Dashboard({ onOpenBillingRun }) {
  const { authFetch, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOverdue, setSelectedOverdue] = useState(null);
  const [timeFilter, setTimeFilter] = useState('month');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/reports/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading Brightloop Financial Metrics...</p>
        </div>
      </div>
    );
  }

  const { kpis, subsByStatus, subsByPlan, revenueByMethod, overdueInvoices, recentPayments, monthlyTrend } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Billing Action */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-primary-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Floating Ambient Orbs */}
        <div className="orb-ambient absolute -right-10 -top-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="orb-ambient absolute left-1/3 -bottom-10 w-64 h-64 bg-primary-500/15 rounded-full blur-2xl pointer-events-none [animation-delay:4s]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-primary-500/20 text-primary-300 border border-primary-500/30">
              Finance & Billing Operations
            </span>
            <span className="text-xs text-slate-300 font-medium">Month of October 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white font-['Outfit']">
            Brightloop Revenue Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time tracking of active subscriptions, automated recurring billing, collections, and overdue chasing.
          </p>

          {/* Interactive Time Range Pills */}
          <div className="flex items-center gap-1.5 mt-4">
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                timeFilter === 'month'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter('30d')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                timeFilter === '30d'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeFilter('ytd')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                timeFilter === 'ytd'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
              }`}
            >
              Year-to-Date (2026)
            </button>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/support-tickets')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 backdrop-blur-md shadow-xs transition-all hover:scale-102"
          >
            <LifeBuoy className="w-4 h-4 text-rose-300" />
            <span>Care Desk</span>
          </button>

          <button
            onClick={onOpenBillingRun}
            className="shimmer-active flex items-center gap-2 px-5 py-2.5 btn-emerald-glow text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 transition-all hover:scale-102 active:scale-98"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Execute Billing Run</span>
          </button>
        </div>
      </div>

      {/* KPI Grid (REP-3 Core Questions - Interactive Click-to-Jump) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Q1: How many subscriptions are active? */}
        <StatsCard
          title="Active Subscriptions"
          value={kpis.activeSubscriptions}
          subtitle="Generating recurring revenue"
          icon={Repeat}
          color="emerald"
          onClick={() => navigate('/subscriptions')}
        />

        {/* Q2: How much revenue came in? */}
        <StatsCard
          title="Total Revenue Collected"
          value={`$${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Settled payments to date"
          icon={DollarSign}
          color="primary"
          onClick={() => navigate('/payments')}
        />

        {/* Q3: How much is still owed? */}
        <StatsCard
          title="Total Outstanding"
          value={`$${kpis.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Unsettled confirmed invoices"
          icon={Clock}
          color="amber"
          onClick={() => navigate('/invoices')}
        />

        {/* Q4: Which invoices are overdue? */}
        <StatsCard
          title="Overdue Invoices"
          value={kpis.overdueCount}
          subtitle={`$${kpis.overdueTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} at risk`}
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* MRR & ARR Sub-metrics Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estimated MRR</p>
            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              ${kpis.estimatedMRR.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:pl-6">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estimated ARR</p>
            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
              ${kpis.estimatedARR.toLocaleString('en-US', { minimumFractionDigits: 2 })}/yr
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:pl-6">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Billing System Status</p>
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Billing Active
            </p>
          </div>
          <Link
            to="/subscriptions"
            className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Manage <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main 2-column Layout: Overdue Invoices to Chase & Subscriptions breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Overdue Invoices (PAY-4 & REP-3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Overdue Invoices Requiring Follow-Up
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Past payment terms due date. Chase immediately to prevent revenue loss.
              </p>
            </div>
            <Link
              to="/invoices?overdue_only=true"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              View all ({overdueInvoices.length})
            </Link>
          </div>

          {overdueInvoices.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-700">
              🎉 Outstanding collections are in order! No overdue invoices at this time.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/invoices/${inv.id}`} className="font-mono font-bold text-slate-900 hover:text-primary-600">
                        {inv.number}
                      </Link>
                      <StatusBadge status="confirmed" isOverdue={true} />
                    </div>
                    <p className="font-medium text-slate-700 mt-1">
                      {inv.customer_name} {inv.customer_company ? `(${inv.customer_company})` : ''}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Due: <span className="font-semibold text-rose-600">{inv.due_date}</span> • Issue: {inv.issue_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-slate-400 text-[11px]">Outstanding</p>
                      <p className="font-mono font-bold text-rose-600 text-sm">
                        ${Number(inv.outstanding).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedOverdue(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Chase</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Subscriptions by Plan & Lifecycle */}
        <div className="space-y-6">
          {/* Subscriptions by Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Subscription Status Breakdown</h3>
            <div className="space-y-2">
              {subsByStatus.map(s => (
                <div key={s.status} className="flex items-center justify-between text-xs py-1">
                  <StatusBadge status={s.status} />
                  <span className="font-bold text-slate-800">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscriptions by Plan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Active Licenses by Plan</h3>
            <div className="space-y-2.5 text-xs">
              {subsByPlan.map((p, i) => (
                <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-800">{p.plan_name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{p.billing_period} billing</p>
                  </div>
                  <span className="font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    {p.count} active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Collections Feed & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Recent Payment Receipts
            </h3>
            <Link to="/payments" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
            {recentPayments.length === 0 ? (
              <p className="p-4 text-slate-400 text-center">No payment transactions recorded yet.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.customer_name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-primary-600 font-semibold">{p.invoice_number}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {p.payment_date} via <span className="font-medium text-slate-700">{p.method}</span>
                      {p.note && <span className="italic ml-1">({p.note})</span>}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    +${Number(p.amount).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue by Method */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Collections by Method</h3>
          <div className="space-y-3 text-xs">
            {revenueByMethod.map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-700">{m.method}</span>
                  <span className="font-mono font-bold text-slate-900">${Number(m.total).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(10, (m.total / (kpis.totalRevenue || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chase Reminder Modal */}
      {selectedOverdue && (
        <ChaseReminderModal
          isOpen={!!selectedOverdue}
          onClose={() => setSelectedOverdue(null)}
          invoice={selectedOverdue}
          onChaseSent={loadData}
        />
      )}
    </div>
  );
}
