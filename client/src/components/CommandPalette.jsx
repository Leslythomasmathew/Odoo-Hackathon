import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  LayoutDashboard,
  Repeat,
  FileText,
  CreditCard,
  Users,
  LifeBuoy,
  Tag,
  Cpu,
  Zap,
  Bot,
  Ticket,
  Shield,
  ArrowRight,
  CornerDownLeft,
  X,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export function CommandPalette({ isOpen, onClose, onOpenBillingRun }) {
  const { user, isCustomer, isAdmin, switchUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd/Ctrl + K or Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or custom event
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Command items catalog
  const items = [
    // Fast Actions
    {
      id: 'action-billing',
      category: 'Quick Actions',
      title: 'Execute Automated Billing Run',
      description: 'Trigger milestone invoice generation & rule engine',
      icon: Zap,
      color: 'text-amber-500 bg-amber-50',
      action: () => {
        onClose();
        if (onOpenBillingRun) onOpenBillingRun();
      }
    },
    // Role-tailored Quick Actions
    ...(isCustomer ? [
      {
        id: 'action-chat',
        category: 'Quick Actions',
        title: 'Open BrightCare AI Assistant',
        description: 'Ask questions about billing, active plans, or portal features',
        icon: Bot,
        color: 'text-primary-600 bg-primary-50',
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-brightcare-chat'));
        }
      },
      {
        id: 'action-ticket',
        category: 'Quick Actions',
        title: 'Submit Customer Support Ticket',
        description: 'Open enquiry drawer for prompt engineer triage',
        icon: Ticket,
        color: 'text-indigo-600 bg-indigo-50',
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('switch-portal-tab', { detail: 'support' }));
          navigate('/portal?tab=support');
        }
      }
    ] : [
      {
        id: 'action-support-desk',
        category: 'Quick Actions',
        title: 'Review Customer Care Desk',
        description: 'Triage customer inquiries, respond to tickets & resolve issues',
        icon: LifeBuoy,
        color: 'text-rose-500 bg-rose-50',
        action: () => {
          onClose();
          navigate('/support-tickets');
        }
      },
      {
        id: 'action-new-sub',
        category: 'Quick Actions',
        title: 'Manage Subscriptions',
        description: 'Contracts, billing frequencies, renewals, and pause states',
        icon: Repeat,
        color: 'text-emerald-500 bg-emerald-50',
        action: () => {
          onClose();
          navigate('/subscriptions');
        }
      }
    ]),

    // Navigation Pages
    {
      id: 'nav-portal',
      category: 'Navigation',
      title: 'Customer Self-Service Portal',
      description: 'Manage subscriptions, invoices, payments & support',
      icon: Users,
      color: 'text-blue-500 bg-blue-50',
      action: () => {
        onClose();
        navigate('/portal');
      }
    },
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Executive Financial Dashboard',
      description: 'Revenue KPI hub, MRR, churn rate, and collections',
      icon: LayoutDashboard,
      color: 'text-primary-600 bg-primary-50',
      action: () => {
        onClose();
        navigate('/');
      }
    },
    {
      id: 'nav-subs',
      category: 'Navigation',
      title: 'Subscriptions Management',
      description: 'Contracts, billing frequencies, renewals, and pause states',
      icon: Repeat,
      color: 'text-emerald-500 bg-emerald-50',
      action: () => {
        onClose();
        navigate('/subscriptions');
      }
    },
    {
      id: 'nav-invoices',
      category: 'Navigation',
      title: 'Invoices & Billing Statements',
      description: 'Search invoices, download PDFs, view payment receipts',
      icon: FileText,
      color: 'text-amber-500 bg-amber-50',
      action: () => {
        onClose();
        navigate('/invoices');
      }
    },
    {
      id: 'nav-payments',
      category: 'Navigation',
      title: 'Payments & Overdue Collections',
      description: 'Transaction history, chase reminders, automated settlement',
      icon: CreditCard,
      color: 'text-teal-500 bg-teal-50',
      action: () => {
        onClose();
        navigate('/payments');
      }
    },
    {
      id: 'nav-discounts',
      category: 'Navigation',
      title: 'Automated Discount Rules',
      description: 'Tiered promotions, bulk discounts, seasonal campaigns',
      icon: Tag,
      color: 'text-purple-500 bg-purple-50',
      action: () => {
        onClose();
        navigate('/discounts');
      }
    },
    {
      id: 'nav-support',
      category: 'Navigation',
      title: 'Customer Care Desk',
      description: 'Triage customer inquiries, respond to tickets, manage SLA',
      icon: LifeBuoy,
      color: 'text-rose-500 bg-rose-50',
      action: () => {
        onClose();
        navigate('/support-tickets');
      }
    },
    {
      id: 'nav-system',
      category: 'Navigation',
      title: 'System Health & Benchmark Hub',
      description: 'Stress testing, performance telemetry, SQLite WAL metrics',
      icon: Cpu,
      color: 'text-cyan-600 bg-cyan-50',
      action: () => {
        onClose();
        navigate('/system');
      }
    },

    // Demo Role Switcher
    {
      id: 'role-admin',
      category: 'Switch Role (Testing)',
      title: 'Switch to Sarah Jenkins (Admin)',
      description: 'admin@brightloop.com — Full system control & settings',
      icon: Shield,
      color: 'text-rose-600 bg-rose-50',
      action: async () => {
        onClose();
        await switchUser('admin@brightloop.com');
        window.location.reload();
      }
    },
    {
      id: 'role-staff',
      category: 'Switch Role (Testing)',
      title: 'Switch to Marcus Vance (Staff)',
      description: 'staff@brightloop.com — Daily operations and support',
      icon: Shield,
      color: 'text-indigo-600 bg-indigo-50',
      action: async () => {
        onClose();
        await switchUser('staff@brightloop.com');
        window.location.reload();
      }
    },
    {
      id: 'role-customer',
      category: 'Switch Role (Testing)',
      title: 'Switch to Alex Rivera (Customer)',
      description: 'customer@acmecorp.com — Self-service customer portal',
      icon: Shield,
      color: 'text-emerald-600 bg-emerald-50',
      action: async () => {
        onClose();
        await switchUser('customer@acmecorp.com');
        window.location.reload();
      }
    }
  ];

  // Filter items by query
  const filtered = items.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Handle arrow key navigation inside search results
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Frosted Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Floating Spotlight Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 animate-in zoom-in-95 fade-in duration-150 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Search Header */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page name, or action (e.g. 'billing', 'invoices', 'admin')..."
            className="w-full text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-600">No matching commands or pages found</p>
              <p className="text-[11px] mt-1">Try searching for "subscriptions", "billing", or "ticket"</p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-50/90 text-primary-950 border border-primary-200/70 shadow-xs translate-x-0.5'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-['Outfit'] text-slate-900">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-primary-600 font-semibold text-xs shrink-0 ml-2">
                      <span className="text-[10px] uppercase tracking-wider">Execute</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-xs">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold shadow-xs">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="text-indigo-600 font-semibold">Brightloop Command Hub</span>
        </div>
      </div>
    </div>
  );
}
