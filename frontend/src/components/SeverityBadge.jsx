import React from 'react';

const SeverityBadge = ({ severity }) => {
  const getStyles = () => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStyles()}`}>
      {severity}
    </span>
  );
};

export default SeverityBadge;
