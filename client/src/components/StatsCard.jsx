import React from 'react';

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'primary', onClick }) {
  const colorMap = {
    primary: {
      bg: 'bg-primary-500/10',
      text: 'text-primary-600',
      border: 'border-primary-200/60',
      glow: 'group-hover:shadow-primary-500/15',
      accent: 'bg-primary-500'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-200/60',
      glow: 'group-hover:shadow-emerald-500/15',
      accent: 'bg-emerald-500'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      border: 'border-amber-200/60',
      glow: 'group-hover:shadow-amber-500/15',
      accent: 'bg-amber-500'
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-200/60',
      glow: 'group-hover:shadow-rose-500/15',
      accent: 'bg-rose-500'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-600',
      border: 'border-purple-200/60',
      glow: 'group-hover:shadow-purple-500/15',
      accent: 'bg-purple-500'
    }
  };

  const scheme = colorMap[color] || colorMap.primary;

  return (
    <div
      onClick={onClick}
      className={`interactive-card relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-hidden group select-none ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      {/* Top micro accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${scheme.accent} opacity-80 group-hover:h-1.5 transition-all`} />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider font-['Outfit']">
          {title}
        </p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs ${scheme.bg} ${scheme.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Outfit'] group-hover:translate-x-0.5 transition-transform">
          {value}
        </h3>
        {subtitle && (
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            {trend && (
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[11px] font-extrabold ${
                trend.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {trend.positive ? '↑' : '↓'} {trend.text}
              </span>
            )}
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}
