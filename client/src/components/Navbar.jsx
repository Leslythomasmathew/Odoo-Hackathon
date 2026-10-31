import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Zap, Shield, User, LogOut, ChevronDown, Check } from 'lucide-react';

export function Navbar({ onOpenBillingRun }) {
  const { user, logout, switchUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const roles = [
    { tier: 'Tier 1 (Supreme)', label: '👑 Admin Supreme (Sarah Jenkins)', email: 'admin@brightloop.com', role: 'admin', desc: 'Absolute authority: full system control, product catalog, discounts, taxes, staff provisioning' },
    { tier: 'Tier 2 (Operational)', label: '🛡️ Internal Staff (Marcus Vance)', email: 'staff@brightloop.com', role: 'staff', desc: 'Operations: day-to-day subscriptions, quotations, invoices, payments, overdue chasing' },
    { tier: 'Tier 3 (Self-Serve)', label: '👤 User / Customer (Alex Rivera)', email: 'customer@acmecorp.com', role: 'customer', desc: 'Client portal: scoped strictly to own subscriptions, invoices, and payments (Acme Corp)' }
  ];

  const handleSwitch = async (email) => {
    setSwitching(true);
    try {
      await switchUser(email);
      setDropdownOpen(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return { label: '👑 Admin (Supreme)', bg: 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs' };
    if (role === 'staff') return { label: '🛡️ Staff (Operations)', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    return { label: '👤 User (Customer Portal)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="no-print bg-white border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-sm shadow-primary-500/20">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">Brightloop</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Subscription & Recurring Billing Platform
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Billing Runner Trigger (for Admin/Staff) */}
            {user?.role !== 'customer' && onOpenBillingRun && (
              <button
                onClick={onOpenBillingRun}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-xs"
                title="Execute automated bulk billing run for due subscriptions"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span className="hidden sm:inline">Run Billing</span>
              </button>
            )}

            {/* Quick Role Switcher for Hackathon / Evaluation */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200 transition-colors"
                title="Switch role for quick testing"
              >
                <Shield className="w-3.5 h-3.5 text-primary-600" />
                <span className="hidden md:inline">Switch Role:</span>
                <span className="font-bold text-slate-900 capitalize">{user?.role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Role Hierarchy</span>
                        <span className="text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded font-mono font-bold">Admin Supreme → Staff → User</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Switch role to inspect permissions:</p>
                    </div>
                    {roles.map(r => (
                      <button
                        key={r.email}
                        disabled={switching}
                        onClick={() => handleSwitch(r.email)}
                        className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors flex items-start justify-between border-b border-slate-50 last:border-b-0 ${user?.email === r.email ? 'bg-primary-50/50 text-primary-700 font-semibold' : 'text-slate-700'}`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.tier}:</span>
                            <p className="font-bold">{r.label}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{r.desc}</p>
                        </div>
                        {user?.email === r.email && (
                          <Check className="w-4 h-4 text-primary-600 mt-1 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* User profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[120px]">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
