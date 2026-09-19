import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import SeverityBadge from '../components/SeverityBadge';
import { ScanSearch, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await apiFetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.detail || 'The dashboard service could not be reached.');
      }
    } catch (err) {
      setError('The API is offline. Start the backend and refresh this page.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Process timeline data from backend
  const timelineData = stats?.timeline?.map(item => {
    const d = new Date(item.date);
    const dayName = isNaN(d.getTime()) ? item.date : d.toLocaleDateString(undefined, { weekday: 'short' });
    return {
      name: dayName,
      date: item.date,
      alerts: item.count || 0
    };
  }) || [
    { name: 'Mon', alerts: 0 },
    { name: 'Tue', alerts: 0 },
    { name: 'Wed', alerts: 0 },
    { name: 'Thu', alerts: 0 },
    { name: 'Fri', alerts: 0 },
    { name: 'Sat', alerts: 0 },
    { name: 'Sun', alerts: 0 }
  ];

  // Process severity breakdown from backend
  const severityColors = {
    critical: '#f43f5e',
    high: '#f59e0b',
    medium: '#eab308',
    low: '#10b981'
  };

  const rawBreakdown = stats?.severity_breakdown || {};
  const severityData = [
    { name: 'Critical', value: rawBreakdown.critical || 0, color: severityColors.critical },
    { name: 'High', value: rawBreakdown.high || 0, color: severityColors.high },
    { name: 'Medium', value: rawBreakdown.medium || 0, color: severityColors.medium },
    { name: 'Low', value: rawBreakdown.low || 0, color: severityColors.low }
  ];

  const totalSeverityCount = severityData.reduce((acc, curr) => acc + curr.value, 0);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <p>Loading security metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Security Overview</h1>
          <p className="text-slate-400">Real-time monitoring of privacy leaks and data loss prevention.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
          <Link
            to="/ingest"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg hover:from-cyan-400 hover:to-blue-400 transition-all"
          >
            <ScanSearch className="w-4 h-4" />
            Scan Payload
          </Link>
        </div>
      </div>

      {error && <div className="page-error" role="alert"><AlertTriangle className="w-4 h-4" />{error}</div>}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Ingested Logs" value={stats?.total_scans?.toLocaleString() || '0'} icon={ScanSearch} color="blue" />
        <StatCard title="Active Alerts" value={stats?.active_alerts || 0} icon={ShieldAlert} color="amber" />
        <StatCard title="Resolved Incidents" value={stats?.resolved_alerts || 0} icon={CheckCircle} color="emerald" />
        <StatCard title="Critical Breaches" value={stats?.critical_alerts || 0} icon={AlertTriangle} color="rose" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline Chart */}
        <div className="glass-card p-6 lg:col-span-2 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-200">Alert Volume (Last 7 Days)</h2>
            <span className="text-xs text-slate-400 font-mono">DLP Stream</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-200">Severity Distribution</h2>
            <span className="text-xs text-slate-400">{totalSeverityCount} Total</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalSeverityCount > 0 ? severityData : [{ name: 'No Data', value: 1, color: '#334155' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {(totalSeverityCount > 0 ? severityData : [{ color: '#334155' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs mt-auto pt-2 border-t border-white/5">
            {severityData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-1.5 rounded bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-200 font-mono">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Recent DLP Findings</h2>
            <p className="text-xs text-slate-400">Latest potential data leak detections across all sources.</p>
          </div>
          <Link to="/alerts" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
            View all alerts <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-4">Rule Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3">Time</th>
                <th className="pb-3 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_alerts && stats.recent_alerts.length > 0 ? (
                stats.recent_alerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 pl-4 text-sm font-medium text-slate-200">
                      {alert.rule_name}
                    </td>
                    <td className="py-3 text-xs">
                      <span className="font-mono text-slate-400 uppercase">{alert.match_type || 'regex'}</span>
                    </td>
                    <td className="py-3">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-3 text-xs font-mono text-slate-300">
                      {Math.round((alert.confidence || 1.0) * 100)}%
                    </td>
                    <td className="py-3 text-xs text-slate-400 font-mono">
                      {alert.created_at || alert.timestamp ? new Date(alert.created_at || alert.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link 
                        to="/alerts" 
                        className="text-xs px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
                    No detections recorded yet. Use the <Link to="/ingest" className="text-cyan-400 underline">Ingest page</Link> to scan sample payloads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
