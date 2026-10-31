import React from 'react';

export function StatusBadge({ status, isOverdue }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        Overdue
      </span>
    );
  }

  const normalized = (status || '').toLowerCase();

  const styles = {
    active: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 shadow-2xs',
    paid: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 shadow-2xs',
    confirmed: 'bg-blue-500/10 text-blue-700 border-blue-300/60 shadow-2xs',
    quotation: 'bg-purple-500/10 text-purple-700 border-purple-300/60 shadow-2xs',
    draft: 'bg-slate-100 text-slate-700 border-slate-200 shadow-2xs',
    paused: 'bg-amber-500/10 text-amber-700 border-amber-300/60 shadow-2xs',
    closed: 'bg-slate-200/80 text-slate-700 border-slate-300 shadow-2xs',
    cancelled: 'bg-rose-500/10 text-rose-700 border-rose-300/60 shadow-2xs',
    expired: 'bg-orange-500/10 text-orange-700 border-orange-300/60 shadow-2xs',
    limit_reached: 'bg-gray-100 text-gray-700 border-gray-300 shadow-2xs'
  };

  const dots = {
    active: 'bg-emerald-500 animate-pulse',
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      <span>{label}</span>
    </span>
  );
}
