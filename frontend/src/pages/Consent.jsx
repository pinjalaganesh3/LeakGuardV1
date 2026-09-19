import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Check, X, Search, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';

const Consent = () => {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ 
    user_identifier: '', 
    purpose: 'data_processing', 
    granted: true,
    ip_address: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConsents = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch('/api/consent');
      if (res.ok) {
        const data = await res.json();
        setConsents(data);
      }
    } catch (e) {
      console.error("Failed to fetch consent records:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_identifier.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_identifier: formData.user_identifier.trim(),
          purpose: formData.purpose,
          granted: formData.granted,
          ip_address: formData.ip_address.trim() || undefined
        })
      });

      if (res.ok) {
        const created = await res.json();
        setConsents(prev => [created, ...prev]);
        setFormData({ user_identifier: '', purpose: 'data_processing', granted: true, ip_address: '' });
      }
    } catch (e) {
      console.error("Failed to save consent:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredConsents = consents.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userId = (c.user_identifier || c.user_id || '').toLowerCase();
    const purpose = (c.purpose || '').toLowerCase();
    return userId.includes(term) || purpose.includes(term);
  });

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Consent Management</h1>
          <p className="text-slate-400 mt-1 text-sm">Track, verify, and enforce user privacy consent under GDPR/CCPA regulations.</p>
        </div>
        <button
          onClick={fetchConsents}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add Consent Form */}
      <div className="glass-card p-6 border-t-4 border-t-cyan-500">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          Record New Privacy Consent
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-400 mb-1 font-medium">User Identifier *</label>
            <input 
              type="text" 
              required
              value={formData.user_identifier}
              onChange={e => setFormData({...formData, user_identifier: e.target.value})}
              placeholder="e.g. user_98432 or email@domain.com"
              className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-400 mb-1 font-medium">Purpose</label>
            <select 
              value={formData.purpose}
              onChange={e => setFormData({...formData, purpose: e.target.value})}
              className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="data_processing">Data Processing</option>
              <option value="analytics">Analytics & Telemetry</option>
              <option value="marketing">Marketing Communications</option>
              <option value="ai_training">AI Model Training</option>
              <option value="third_party_sharing">Third-Party Sharing</option>
            </select>
          </div>

          <div className="w-full md:w-36">
            <label className="block text-xs text-slate-400 mb-1 font-medium">IP Address (Opt)</label>
            <input 
              type="text" 
              value={formData.ip_address}
              onChange={e => setFormData({...formData, ip_address: e.target.value})}
              placeholder="192.168.1.1"
              className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div 
            className="flex items-center h-9.5 px-4 bg-[#0b1120] border border-white/10 rounded-lg gap-2 cursor-pointer hover:border-white/20 transition-colors" 
            onClick={() => setFormData({...formData, granted: !formData.granted})}
          >
            <input 
              type="checkbox" 
              checked={formData.granted}
              onChange={() => {}}
              className="accent-cyan-500 w-4 h-4 cursor-pointer"
            />
            <label className="text-sm text-slate-300 cursor-pointer select-none">Granted</label>
          </div>

          <button 
            type="submit"
            disabled={submitting || !formData.user_identifier.trim()}
            className="h-9.5 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {submitting ? 'Recording...' : 'Record'}
          </button>
        </form>
      </div>

      {/* Consent Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/2 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <h2 className="text-base font-semibold text-white">Active Consent Records ({consents.length})</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search user or purpose..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b1120] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/1">
                <th className="py-3 pl-6">User Identifier</th>
                <th className="py-3">Purpose</th>
                <th className="py-3">Status</th>
                <th className="py-3">IP Address</th>
                <th className="py-3 pr-6 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-slate-400">Loading consent records...</td></tr>
              ) : filteredConsents.length > 0 ? (
                filteredConsents.map((c, i) => {
                  const timestampStr = c.created_at || c.timestamp;
                  const formattedTime = timestampStr ? new Date(timestampStr).toLocaleString() : 'N/A';

                  return (
                    <tr key={c.id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="py-3 pl-6 font-mono text-sm text-slate-200">
                        {c.user_identifier || c.user_id}
                      </td>
                      <td className="py-3 text-sm text-slate-300 capitalize">
                        {c.purpose?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full font-semibold ${
                          c.granted 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {c.granted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {c.granted ? 'GRANTED' : 'DENIED'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-400">
                        {c.ip_address || '—'}
                      </td>
                      <td className="py-3 pr-6 text-xs text-slate-400 text-right font-mono">
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                    No consent records found matching criteria.
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

export default Consent;
