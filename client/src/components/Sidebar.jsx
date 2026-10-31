import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Repeat,
  FileText,
  CreditCard,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Tag,
  Percent,
  UserCheck,
  BarChart3,
  Cpu,
  UserCircle,
  Mail
} from 'lucide-react';

export function Sidebar() {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
    }`;

  // Customer Portal navigation
  if (isCustomer) {
    return (
      <aside className="no-print w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Hierarchy Banner */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">👤</span>
              <div>
                <p className="font-bold text-emerald-900 leading-tight">Tier 3: User Portal</p>
                <p className="text-[10px] text-emerald-700 font-semibold uppercase">Self-Serve Data Scoping</p>
              </div>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Self-Service</p>
            <nav className="space-y-1">
              <NavLink to="/portal" className={navClass} end>
                <UserCircle className="w-4 h-4 text-primary-600" />
                <span>My Portal Overview</span>
              </NavLink>
              <NavLink to="/subscriptions" className={navClass}>
                <Repeat className="w-4 h-4 text-slate-500" />
                <span>My Subscriptions</span>
              </NavLink>
              <NavLink to="/invoices" className={navClass}>
                <FileText className="w-4 h-4 text-slate-500" />
                <span>My Invoices & Receipts</span>
              </NavLink>
              <NavLink to="/payments" className={navClass}>
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Payment History</span>
              </NavLink>
            </nav>
          </div>
        </div>

        <div className="p-3 bg-primary-50/60 rounded-xl border border-primary-100 text-xs">
          <p className="font-bold text-primary-900">Brightloop Customer Portal</p>
          <p className="text-slate-500 text-[11px] mt-1">
            Manage your renewals, invoices, and payment methods with zero wait time.
          </p>
        </div>
      </aside>
    );
  }

  // Admin & Staff Navigation
  return (
    <aside className="no-print w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Hierarchy Banner */}
        {isAdmin ? (
          <div className="p-3 bg-gradient-to-r from-rose-50 to-purple-50 rounded-xl border border-rose-200 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">👑</span>
              <div>
                <p className="font-black text-rose-950 leading-tight">Tier 1: Admin Supreme</p>
                <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Absolute System Authority</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Full control of staff (AUTH-6), catalog, variants (+560), discounts & billing runs.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <p className="font-black text-indigo-950 leading-tight">Tier 2: Internal Staff</p>
                <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Operational Authority</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Day-to-day sales, quotations, invoices & collections. Rules managed by Admin Supreme.
            </p>
          </div>
        )}

        {/* Core Operations */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operations</p>
          <nav className="space-y-1">
            <NavLink to="/" className={navClass} end>
              <LayoutDashboard className="w-4 h-4 text-primary-600" />
              <span>Executive Dashboard</span>
            </NavLink>
            <NavLink to="/subscriptions" className={navClass}>
              <Repeat className="w-4 h-4 text-indigo-500" />
              <span>Subscriptions</span>
            </NavLink>
            <NavLink to="/invoices" className={navClass}>
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Invoices & Billing</span>
            </NavLink>
            <NavLink to="/payments" className={navClass}>
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Payments & Overdue</span>
            </NavLink>
            <NavLink to="/customers" className={navClass}>
              <Users className="w-4 h-4 text-blue-500" />
              <span>Customers</span>
            </NavLink>
          </nav>
        </div>

        {/* Catalog & Selling */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Catalog & Selling</p>
          <nav className="space-y-1">
            <NavLink to="/products" className={navClass}>
              <Package className="w-4 h-4 text-slate-500" />
              <span>Products & Variants</span>
            </NavLink>
            <NavLink to="/plans" className={navClass}>
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Subscription Plans</span>
            </NavLink>
            <NavLink to="/quotation-templates" className={navClass}>
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Quotation Templates</span>
            </NavLink>
          </nav>
        </div>

        {/* Finance, Rules & System */}
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rules & Administration</p>
          <nav className="space-y-1">
            <NavLink to="/discounts" className={navClass}>
              <Tag className="w-4 h-4 text-purple-500" />
              <span>Discount Rules {isAdmin && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold ml-auto">Admin</span>}</span>
            </NavLink>
            <NavLink to="/taxes" className={navClass}>
              <Percent className="w-4 h-4 text-slate-500" />
              <span>Tax Rules {isAdmin && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold ml-auto">Admin</span>}</span>
            </NavLink>

            {isAdmin && (
              <NavLink to="/staff" className={navClass}>
                <UserCheck className="w-4 h-4 text-rose-500" />
                <span>Internal Staff</span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/communication-settings" className={navClass}>
                <Mail className="w-4 h-4 text-primary-600" />
                <span>Email & SMS Gateway</span>
              </NavLink>
            )}

            <NavLink to="/reports" className={navClass}>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Financial Reports</span>
            </NavLink>

            {isAdmin && (
              <NavLink to="/system" className={navClass}>
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>System & Benchmark</span>
              </NavLink>
            )}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Brightloop 2.0</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Recurring Billing Engine Online</p>
      </div>
    </aside>
  );
}
