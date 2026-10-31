import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  Shield,
  User,
  LogOut,
  ChevronDown,
  Check,
  Search,
  Bell,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Command,
  X
} from 'lucide-react';

export function Navbar({ onOpenBillingRun, onOpenCommandPalette }) {
  const { user, logout, switchUser } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Sample live notifications for realistic interactivity
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Automated Billing Run Complete',
      time: '12m ago',
      unread: true,
      type: 'billing',
      detail: 'Generated 4 confirmed invoices with eligible volume discounts applied.'
    },
    {
      id: 2,
      title: 'Payment Received — $2,975.00',
      time: '45m ago',
      unread: true,
      type: 'payment',
      detail: 'Settlement confirmed for invoice INV-2026-0001 via Credit Card.'
    },
    {
      id: 3,
      title: 'Customer Care Ticket Updated',
      time: '2h ago',
      unread: false,
      type: 'ticket',
      detail: 'TICK-2026-0001 (Invoice query) updated by Marcus Vance.'
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const roles = [
    {
      label: 'Admin (Sarah Jenkins)',
      email: 'admin@brightloop.com',
      role: 'admin',
      desc: 'Executive access, plans, taxes, staff oversight',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      label: 'Staff (Marcus Vance)',
      email: 'staff@brightloop.com',
      role: 'staff',
      desc: 'Day-to-day operations, billing runs, support triage',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      label: 'Customer (Alex Rivera)',
      email: 'customer@acmecorp.com',
      role: 'customer',
      desc: 'Self-service portal, subscriptions, payments & chat',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  ];

  const handleSwitch = async (email) => {
    setSwitching(true);
    try {
      await switchUser(email);
      setRoleDropdownOpen(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return { label: 'Admin', bg: 'bg-rose-500/10 text-rose-700 border-rose-200' };
    if (role === 'staff') return { label: 'Staff Lead', bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' };
    return { label: 'Customer Portal', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
  };

  const badge = getRoleBadge(user?.role);

  return (
    <header className="no-print glass-header sticky top-0 z-40 transition-all duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* LEFT: BRAND LOGO & SYSTEM STATUS */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-primary-500/25 group-hover:scale-105 transition-transform">
                <span className="font-['Outfit'] text-base tracking-tighter">B</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-lg font-['Outfit']">
                    Brightloop
                  </span>
                  <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Subscription & Recurring Billing Hub
                </p>
              </div>
            </div>

            {/* Live Telemetry Health Pill */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setHealthModalOpen(!healthModalOpen)}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 text-[11px] font-bold transition-all shadow-2xs"
                title="View real-time engine health & benchmark latency"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync Active</span>
                <span className="text-[10px] text-emerald-600/80 font-mono font-medium">0.8ms</span>
              </button>

              {healthModalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHealthModalOpen(false)} />
                  <div className="absolute left-0 mt-2 w-72 p-3 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 animate-in fade-in slide-in-from-top-1 text-xs space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        Platform Telemetry
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        99.99% Uptime
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>Database Engine:</span>
                        <span className="font-mono font-bold text-slate-800">Node SQLite (WAL)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Query Latency:</span>
                        <span className="font-mono font-bold text-emerald-600">sub-millisecond</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Scheduler:</span>
                        <span className="font-mono font-bold text-slate-800">Autonomous Cron (24/7)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Customer Care:</span>
                        <span className="font-mono font-bold text-indigo-600">BrightCare 2.0 Active</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CENTER: INTERACTIVE SPOTLIGHT SEARCH TRIGGER */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => {
                if (onOpenCommandPalette) onOpenCommandPalette();
                else window.dispatchEvent(new CustomEvent('open-command-palette'));
              }}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/70 text-slate-400 hover:text-slate-600 text-xs transition-all shadow-inner group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 transition-colors" />
                <span className="font-medium text-slate-500">Quick search pages, actions, tickets...</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-slate-500 border border-slate-200 shadow-2xs">
                  ⌘K
                </kbd>
              </div>
            </button>
          </div>

          {/* RIGHT: CONTROLS, NOTIFICATIONS, ROLE SWITCHER, PROFILE */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick Billing Action Trigger (for Admin/Staff or Customer simulation) */}
            {onOpenBillingRun && (
              <button
                onClick={onOpenBillingRun}
                className="shimmer-active inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold btn-emerald-glow shadow-xs hover:scale-102 active:scale-98 transition-all"
                title="Execute automated bulk billing run for due subscriptions"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span className="hidden sm:inline">Run Billing Day</span>
              </button>
            )}

            {/* NOTIFICATIONS CENTER */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in slide-in-from-top-1 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold font-['Outfit'] text-slate-900">
                        <Bell className="w-3.5 h-3.5 text-primary-600" />
                        <span>System Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] font-bold text-primary-600 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                            n.unread ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px]">{n.title}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {n.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {n.detail}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          window.location.href = '/reports';
                        }}
                        className="text-[11px] font-bold text-primary-600 hover:underline"
                      >
                        View Full Activity Audit Log →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* QUICK ROLE SWITCHER POPUP */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200 transition-all hover:scale-102"
                title="Switch role for quick testing"
              >
                <Shield className="w-3.5 h-3.5 text-primary-600" />
                <span className="hidden lg:inline text-slate-500 font-medium">Role:</span>
                <span className="font-extrabold text-slate-900 capitalize">{user?.role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-1 font-['Plus_Jakarta_Sans',sans-serif]">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Demo Role Impersonator
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Test system capabilities with different privileges:
                      </p>
                    </div>

                    <div className="p-1 space-y-1">
                      {roles.map(r => (
                        <button
                          key={r.email}
                          disabled={switching}
                          onClick={() => handleSwitch(r.email)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between ${
                            user?.email === r.email
                              ? 'bg-primary-50/80 text-primary-950 font-bold border border-primary-200/60 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{r.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold border ${r.badgeColor}`}>
                                {r.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{r.desc}</p>
                          </div>
                          {user?.email === r.email && (
                            <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* USER PROFILE & LOGOUT */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 border border-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <p className="font-extrabold text-slate-900 leading-tight truncate max-w-[110px] font-['Outfit']">
                  {user?.name}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out of Brightloop"
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
