import React, { useState, useEffect } from 'react';
import AlertCard from '../components/AlertCard';
import { Search, Filter, ShieldCheck, RefreshCw, AlertCircle, ChevronDown, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openDocuments, setOpenDocuments] = useState({});
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      const res = await apiFetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'The alert service could not be reached.');
      }
    } catch (e) {
      setError('The API is offline. Start the backend and refresh this page.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      const res = await apiFetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (e) {
      console.error(e);
      fetchAlerts();
    }
  };

  const handleRollback = async (id) => {
    try {
      const res = await apiFetch(`/api/alerts/${id}/rollback`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (e) {
      console.error(e);
      fetchAlerts();
    }
  };

  const handleAction = async (id, action) => {
    try {
      const res = await apiFetch(`/api/alerts/${id}/action`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const updated = await res.json();
        setAlerts(prev => prev.map(a => a.id === id ? updated : a));
      }
    } catch (e) {
      console.error(e);
      fetchAlerts();
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const evidenceText = (a.redacted_evidence || a.evidence_redacted || a.raw_evidence || '').toLowerCase();
    const ruleName = (a.rule_name || '').toLowerCase();
    const filename = (a.filename || `scan-${a.log_id}`).toLowerCase();
    const alertIdStr = String(a.id);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = !searchTerm || 
      ruleName.includes(searchLower) || 
      filename.includes(searchLower) ||
      evidenceText.includes(searchLower) ||
      alertIdStr.includes(searchLower);

    const matchesSeverity = severityFilter === 'all' || (a.severity && a.severity.toLowerCase() === severityFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (a.status && a.status.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const openCount = alerts.filter(a => a.status === 'open').length;
  const ackCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  const documentGroups = filteredAlerts.reduce((groups, alert) => {
    const key = String(alert.log_id);
    if (!groups[key]) {
      groups[key] = {
        id: alert.log_id,
        filename: alert.filename || `Scan ${alert.log_id}`,
        sourceType: alert.source_type || 'payload',
        alerts: [],
      };
    }
    groups[key].alerts.push(alert);
    return groups;
  }, {});

  const toggleDocument = (id) => {
    setOpenDocuments((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">Active Alerts</h1>
            {openCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {openCount} Open
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1">Review, acknowledge, throttle, or block identified data leak violations.</p>
        </div>
        
        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchAlerts}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by rule, evidence, ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          <select 
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-all"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {error && <div className="page-error" role="alert"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Status Filter Tabs */}
      <div className="flex border-b border-white/10 gap-2 pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusFilter === 'all' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusFilter === 'open' 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setStatusFilter('acknowledged')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusFilter === 'acknowledged' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Acknowledged ({ackCount})
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusFilter === 'resolved' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <span>Loading alerts from detection engine...</span>
        </div>
      ) : filteredAlerts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {Object.values(documentGroups).map((document) => {
            const isOpen = openDocuments[document.id] ?? true;
            const severityCounts = document.alerts.reduce((counts, alert) => {
              counts[alert.severity] = (counts[alert.severity] || 0) + 1;
              return counts;
            }, {});
            return (
              <section key={document.id} className="glass-card overflow-hidden">
                <button onClick={() => toggleDocument(document.id)} className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-white truncate">{document.filename}</h2>
                      <p className="text-xs text-slate-500">Scan #{document.id} · {document.alerts.length} risks detected</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      {['critical', 'high', 'medium', 'low'].filter((severity) => severityCounts[severity]).map((severity) => (
                        <span key={severity} className="text-[10px] uppercase font-bold text-slate-400">{severity}: {severityCounts[severity]}</span>
                      ))}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && <div className="border-t border-white/10 p-4 flex flex-col gap-5">
                  {['critical', 'high', 'medium', 'low'].map((severity) => {
                    const risks = document.alerts.filter((alert) => alert.severity === severity);
                    if (!risks.length) return null;
                    return <div key={severity} className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{severity} risks</h3>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {risks.map((alert) => <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} onRollback={handleRollback} onAction={handleAction} />)}
                      </div>
                    </div>;
                  })}
                </div>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Matching Alerts</h3>
          <p className="text-slate-400 max-w-md text-sm">
            {alerts.length === 0 
              ? "Your environment is safe. No sensitive data leaks have been detected yet."
              : "No alerts match the selected search or filter criteria."}
          </p>
        </div>
      )}
    </div>
  );
};

export default Alerts;
