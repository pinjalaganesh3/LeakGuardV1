import React, { useState, useEffect } from 'react';
import { Shield, User, Settings, AlertTriangle, FileText, RefreshCw, Filter, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/api';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const url = actionFilter && actionFilter !== 'all' ? `/api/audit?action=${actionFilter}` : '/api/audit';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getIcon = (entityType, action) => {
    if (action?.includes('alert') || entityType === 'alert') {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    if (action?.includes('ingest') || entityType === 'log') {
      return <FileText className="w-4 h-4 text-cyan-400" />;
    }
    if (action?.includes('consent') || entityType === 'consent') {
      return <User className="w-4 h-4 text-emerald-400" />;
    }
    if (action?.includes('rule') || entityType === 'rule') {
      return <Settings className="w-4 h-4 text-amber-400" />;
    }
    return <Shield className="w-4 h-4 text-slate-400" />;
  };

  const renderDetails = (detailsStr) => {
    if (!detailsStr) return <span className="text-slate-500 italic">No details recorded</span>;
    
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(parsed).map(([key, val]) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
                <span className="text-slate-400 font-semibold">{key}:</span>
                <span className="text-cyan-300">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
              </span>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, render as plain string
    }

    return <p className="text-slate-300 text-sm mt-1">{detailsStr}</p>;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (log.action || '').toLowerCase().includes(s) ||
      (log.actor || '').toLowerCase().includes(s) ||
      (log.details || '').toLowerCase().includes(s) ||
      (log.entity_type || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Audit Trail</h1>
          <p className="text-slate-400 mt-1 text-sm">Immutable cryptographic record of all DLP detections, user actions, and system modifications.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchLogs}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>

          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search audit trail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b1120] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Actions</option>
            <option value="log_ingested">Log Ingested</option>
            <option value="alert_acknowledged">Alert Acknowledged</option>
            <option value="alert_action_taken">Alert Action Taken</option>
            <option value="alert_rollback">Alert Rollback</option>
          </select>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-slate-400 py-16 text-center flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span>Loading audit log entries...</span>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="relative border-l border-white/10 ml-3 md:ml-6 space-y-6 pb-4 pt-2">
            {filteredLogs.map((log) => {
              const timestampStr = log.created_at || log.timestamp;
              const formattedTime = timestampStr ? new Date(timestampStr).toLocaleString() : 'N/A';
              const entityType = log.entity_type || log.type;

              return (
                <div key={log.id} className="relative pl-6 md:pl-8 group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-[#0f172a] border border-white/15 flex items-center justify-center shadow-lg group-hover:border-cyan-500/50 transition-colors">
                    {getIcon(entityType, log.action)}
                  </div>
                  
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-cyan-300 font-bold uppercase tracking-wider">{log.action}</span>
                        {entityType && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                            {entityType} {log.entity_id ? `#${log.entity_id}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{formattedTime}</span>
                    </div>

                    <div className="mb-3">
                      {renderDetails(log.details)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-white/5">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>Actor:</span>
                      <span className="text-slate-200 font-mono font-medium">{log.actor || 'system'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 font-mono">Entry #{log.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 text-sm">
            No audit log entries recorded matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
