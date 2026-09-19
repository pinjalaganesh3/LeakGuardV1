import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge';
import { Check, CheckCheck, Clock, Brain, Regex, Shield, ChevronDown, RotateCcw } from 'lucide-react';

const AlertCard = ({ alert, onAcknowledge, onRollback, onAction }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getBorderColor = () => {
    switch (alert.severity?.toLowerCase()) {
      case 'critical': return 'border-l-rose-500';
      case 'high': return 'border-l-amber-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-emerald-500';
      default: return 'border-l-slate-500';
    }
  };

  const formattedDate = alert.created_at || alert.timestamp
    ? new Date(alert.created_at || alert.timestamp).toLocaleString()
    : 'Just now';

  const evidence = alert.redacted_evidence || alert.evidence_redacted || alert.raw_evidence || '';
  const matchType = alert.match_type || 'regex';

  return (
    <div className={`glass-card overflow-hidden border-l-4 ${getBorderColor()} hover:bg-white/[0.07] transition-colors relative`}>
      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                {matchType === 'semantic' ? (
                  <>
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-300">Semantic AI</span>
                  </>
                ) : (
                  <>
                    <Regex className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300">Regex DLP</span>
                  </>
                )}
              </span>
              <h3 className="font-semibold text-slate-200">{alert.rule_name}</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
              <span className="mx-2">•</span>
              <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-slate-300">
                Alert #{alert.id}
              </span>
              {alert.action_taken && (
                <>
                  <span className="mx-2">•</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase text-[10px] font-bold">
                    Action: {alert.action_taken}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {alert.status === 'open' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs text-rose-400 font-medium">
                <div className="w-2 h-2 rounded-full bg-rose-500 pulse-alert"></div>
                Open
              </div>
            )}
            {alert.status === 'acknowledged' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium">
                <Check className="w-3 h-3" />
                Ack'd
              </div>
            )}
            {alert.status === 'resolved' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
                <CheckCheck className="w-3 h-3" />
                Resolved
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0b1120] rounded-lg p-4 font-mono text-sm overflow-x-auto border border-white/5 shadow-inner">
          <div className="text-xs text-slate-500 mb-1 flex justify-between">
            <span>Redacted Evidence:</span>
            <span>Suggested: {alert.suggested_action || 'notify'}</span>
          </div>
          <pre className="text-slate-200 whitespace-pre-wrap font-mono text-xs leading-relaxed">{evidence}</pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex flex-col gap-1 w-1/3">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Confidence</span>
              <span>{Math.round((alert.confidence || 1.0) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full ${
                  (alert.confidence || 1.0) > 0.8 ? 'bg-rose-500' : (alert.confidence || 1.0) > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} 
                style={{ width: `${Math.round((alert.confidence || 1.0) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onAcknowledge(alert.id)}
              disabled={alert.status !== 'open'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Acknowledge
            </button>

            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={alert.status === 'resolved'}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Action
                <ChevronDown className="w-3 h-3" />
              </button>

              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-20 overflow-hidden"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button 
                    onClick={() => { onAction(alert.id, 'notify'); setDropdownOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Notify Team
                  </button>
                  <button 
                    onClick={() => { onAction(alert.id, 'throttle'); setDropdownOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-amber-300 hover:bg-white/10"
                  >
                    Throttle Flow
                  </button>
                  <button 
                    onClick={() => { onAction(alert.id, 'block'); setDropdownOpen(false); }} 
                    className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/20 font-semibold"
                  >
                    Block Stream
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => onRollback(alert.id)}
              title="Rollback action and re-open alert"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Rollback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
