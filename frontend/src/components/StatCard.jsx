import React from 'react';

const colorStyles = {
  blue: {
    bg: 'bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20',
    icon: 'text-cyan-400',
  },
  amber: {
    bg: 'bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20',
    icon: 'text-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20',
    icon: 'text-emerald-400',
  },
  rose: {
    bg: 'bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20',
    icon: 'text-rose-400',
  },
  purple: {
    bg: 'bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20',
    icon: 'text-purple-400',
  }
};

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend }) => {
  const styles = colorStyles[color] || colorStyles.blue;

  return (
    <div className="glass-card p-6 flex items-center justify-between group hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          {trend && (
            <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend}
            </span>
          )}
        </div>
      </div>
      <div className={`p-4 rounded-full border transition-colors ${styles.bg}`}>
        <Icon className={`w-8 h-8 ${styles.icon}`} />
      </div>
    </div>
  );
};

export default StatCard;
