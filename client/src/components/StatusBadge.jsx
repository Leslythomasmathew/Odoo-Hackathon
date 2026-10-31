import React from 'react';

export function StatusBadge({ status, isOverdue }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        Overdue
      </span>
    );
  }

  const normalized = (status || '').toLowerCase();

  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    quotation: 'bg-purple-50 text-purple-700 border-purple-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-slate-200 text-slate-700 border-slate-300',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    expired: 'bg-orange-50 text-orange-700 border-orange-200',
    limit_reached: 'bg-gray-100 text-gray-700 border-gray-300'
  };

  const dots = {
    active: 'bg-emerald-500',
    paid: 'bg-emerald-500',
    confirmed: 'bg-blue-500',
    quotation: 'bg-purple-500',
    draft: 'bg-slate-400',
    paused: 'bg-amber-500',
    closed: 'bg-slate-500',
    cancelled: 'bg-rose-500',
    expired: 'bg-orange-500',
    limit_reached: 'bg-gray-500'
  };

  const style = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const dot = dots[normalized] || 'bg-slate-400';

  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1).replace('_', ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {label}
    </span>
  );
}
