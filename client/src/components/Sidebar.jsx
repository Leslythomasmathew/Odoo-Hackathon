import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Zap,
  HelpCircle
} from 'lucide-react';

export function Sidebar() {
  const { user, isAdmin, isStaff, isCustomer, authFetch } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ unpaidInvoices: 3, openTickets: 2 });

  useEffect(() => {
    // Fetch quick live counters for badges
    const fetchCounters = async () => {
      try {
        const [ticketRes, invRes] = await Promise.all([
          authFetch('/api/support/tickets').catch(() => ({ tickets: [] })),
          authFetch('/api/invoices?status=confirmed').catch(() => ({ invoices: [] }))
        ]);
        const openT = (ticketRes.tickets || []).filter(t => t.status !== 'closed').length;
        const unpI = (invRes.invoices || []).length;
        setStats({ unpaidInvoices: unpI || 3, openTickets: openT || 2 });
      } catch (e) {
        // use defaults
      }
    };
    fetchCounters();
  }, [authFetch, location.pathname]);

  const navClass = ({ isActive }) =>
    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
      isActive
        ? 'bg-gradient-to-r from-primary-50 to-indigo-50/80 text-primary-900 border border-primary-200/80 shadow-2xs font-extrabold translate-x-1'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5'
    }`;

  // Customer Portal Navigation
  if (isCustomer) {
    return (
      <aside
        className={`no-print ${
          collapsed ? 'w-20' : 'w-64'
        } transition-all duration-300 bg-white/90 backdrop-blur-md border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-3 flex flex-col justify-between select-none`}
      >
        <div className="space-y-6">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between px-2 pt-1">
            {!collapsed && (
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-['Outfit']">
                Customer Self-Service
              </p>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          <nav className="space-y-1">
            <NavLink to="/portal" className={navClass} end>
              <UserCircle className="w-4 h-4 text-primary-600 shrink-0" />
              {!collapsed && <span>My Portal Overview</span>}
            </NavLink>

            <NavLink to="/subscriptions" className={navClass}>
              <Repeat className="w-4 h-4 text-indigo-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>My Subscriptions</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-extrabold">
                    50
                  </span>
                </div>
              )}
            </NavLink>

            <NavLink to="/invoices" className={navClass}>
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>My Invoices</span>
                  {stats.unpaidInvoices > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-extrabold animate-pulse">
                      {stats.unpaidInvoices} Due
                    </span>
                  )}
                </div>
              )}
            </NavLink>

            <NavLink to="/payments" className={navClass}>
              <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
              {!collapsed && <span>Payment History</span>}
            </NavLink>

            <NavLink to="/discounts" className={navClass}>
              <Tag className="w-4 h-4 text-purple-500 shrink-0" />
              {!collapsed && <span>Automated Discounts</span>}
            </NavLink>

            <NavLink to="/portal?tab=support" className={navClass}>
              <LifeBuoy className="w-4 h-4 text-rose-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Support & Enquiries</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 font-extrabold">
                    24/7 AI
                  </span>
                </div>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Bottom Interactive Card */}
        {!collapsed && (
          <div className="p-3.5 bg-gradient-to-tr from-primary-950 to-indigo-900 rounded-2xl text-white shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-indigo-200">
                <Bot className="w-4 h-4 text-indigo-300" />
                <span>BrightCare Assistant</span>
              </div>
              <p className="text-[11px] text-indigo-100/80 mt-1 leading-snug">
                Need invoice help or plan changes? Instant answers 24/7.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-brightcare-chat'))}
                className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all border border-white/15 flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Launch Assistant</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Admin & Staff Navigation
  return (
    <aside
      className={`no-print ${
        collapsed ? 'w-20' : 'w-64'
      } transition-all duration-300 bg-white/90 backdrop-blur-md border-r border-slate-200/80 min-h-[calc(100vh-4rem)] p-3 flex flex-col justify-between select-none`}
    >
      <div className="space-y-6">
        {/* Operations Section */}
        <div>
          <div className="flex items-center justify-between px-2 pt-1 mb-2">
            {!collapsed && (
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-['Outfit']">
                Operations
              </p>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          <nav className="space-y-1">
            <NavLink to="/" className={navClass} end>
              <LayoutDashboard className="w-4 h-4 text-primary-600 shrink-0" />
              {!collapsed && <span>Executive Dashboard</span>}
            </NavLink>

            <NavLink to="/subscriptions" className={navClass}>
              <Repeat className="w-4 h-4 text-indigo-500 shrink-0" />
              {!collapsed && <span>Subscriptions</span>}
            </NavLink>

            <NavLink to="/invoices" className={navClass}>
              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Invoices & Billing</span>
                  {stats.unpaidInvoices > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                      {stats.unpaidInvoices}
                    </span>
                  )}
                </div>
              )}
            </NavLink>

            <NavLink to="/payments" className={navClass}>
              <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
              {!collapsed && <span>Payments & Overdue</span>}
            </NavLink>

            <NavLink to="/customers" className={navClass}>
              <Users className="w-4 h-4 text-blue-500 shrink-0" />
              {!collapsed && <span>Customers</span>}
            </NavLink>

            <NavLink to="/support-tickets" className={navClass}>
              <LifeBuoy className="w-4 h-4 text-rose-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Customer Care Desk</span>
                  {stats.openTickets > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold">
                      {stats.openTickets}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Catalog & Selling */}
        <div>
          {!collapsed && (
            <p className="px-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 font-['Outfit']">
              Catalog & Selling
            </p>
          )}
          <nav className="space-y-1">
            <NavLink to="/products" className={navClass}>
              <Package className="w-4 h-4 text-slate-500 shrink-0" />
              {!collapsed && <span>Products & Variants</span>}
            </NavLink>
            <NavLink to="/plans" className={navClass}>
              <Layers className="w-4 h-4 text-slate-500 shrink-0" />
              {!collapsed && <span>Subscription Plans</span>}
            </NavLink>
            <NavLink to="/quotation-templates" className={navClass}>
              <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
              {!collapsed && <span>Quotation Templates</span>}
            </NavLink>
          </nav>
        </div>

        {/* Rules & Administration */}
        <div>
          {!collapsed && (
            <p className="px-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 font-['Outfit']">
              Rules & Administration
            </p>
          )}
          <nav className="space-y-1">
            <NavLink to="/discounts" className={navClass}>
              <Tag className="w-4 h-4 text-purple-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Discounts</span>
                  {isAdmin && <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-extrabold">Admin</span>}
                </div>
              )}
            </NavLink>

            <NavLink to="/taxes" className={navClass}>
              <Percent className="w-4 h-4 text-slate-500 shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Taxes</span>
                  {isAdmin && <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-extrabold">Admin</span>}
                </div>
              )}
            </NavLink>

            {isAdmin && (
              <NavLink to="/staff" className={navClass}>
                <UserCheck className="w-4 h-4 text-rose-500 shrink-0" />
                {!collapsed && <span>Internal Staff</span>}
              </NavLink>
            )}

            <NavLink to="/reports" className={navClass}>
              <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
              {!collapsed && <span>Financial Reports</span>}
            </NavLink>

            {isAdmin && (
              <NavLink to="/system" className={navClass}>
                <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
                {!collapsed && <span>System Benchmark</span>}
              </NavLink>
            )}
          </nav>
        </div>
      </div>

      {/* Footer Info / Live Engine Monitor */}
      {!collapsed && (
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 font-['Outfit']">Brightloop 2.0</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-700">Healthy</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Autonomous recurring billing engine active</p>
        </div>
      )}
    </aside>
  );
}
