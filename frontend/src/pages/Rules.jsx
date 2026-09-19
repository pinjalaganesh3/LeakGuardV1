import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Brain, Regex, Plus, Trash2, X, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import { apiFetch } from '../lib/api';

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    pattern_type: 'regex',
    pattern_value: '',
    severity: 'high',
    description: '',
    enabled: true
  });

  const fetchRules = async () => {
    try {
      const res = await apiFetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) {
      console.error("Failed to fetch rules:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (id, currentStatus) => {
    const newRules = rules.map(r => r.id === id ? { ...r, enabled: !currentStatus } : r);
    setRules(newRules); // Optimistic UI update
    
    try {
      const res = await apiFetch(`/api/rules/${id}/toggle`, { method: 'POST' });
      if (!res.ok) {
        fetchRules(); // Revert on failure
      }
    } catch (e) {
      console.error(e);
      fetchRules();
    }
  };

  const handleDeleteRule = async (id, ruleName) => {
    if (!window.confirm(`Are you sure you want to delete rule "${ruleName}"?`)) return;

    try {
      const res = await apiFetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete rule:", e);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.pattern_value.trim()) {
      setErrorMessage("Please fill in Rule Name and Pattern Value.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await apiFetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          pattern_type: form.pattern_type,
          pattern_value: form.pattern_value.trim(),
          severity: form.severity,
          description: form.description.trim() || undefined,
          enabled: form.enabled
        })
      });

      if (res.ok) {
        const newRule = await res.json();
        setRules(prev => [...prev, newRule]);
        setIsModalOpen(false);
        setForm({
          name: '',
          pattern_type: 'regex',
          pattern_value: '',
          severity: 'high',
          description: '',
          enabled: true
        });
      } else {
        const errData = await res.json().catch(() => ({ detail: "Failed to create rule" }));
        setErrorMessage(errData.detail || "Error creating rule. Rule name might already exist.");
      }
    } catch (err) {
      console.error("Error creating rule:", err);
      setErrorMessage("Network error while creating rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRules = rules.filter(r => {
    const pType = (r.pattern_type || r.type || '').toLowerCase();
    if (filterType === 'regex') return pType === 'regex';
    if (filterType === 'semantic') return pType === 'semantic';
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Detection Rules</h1>
          <p className="text-slate-400 mt-1 text-sm">Configure pattern-matching DLP scanners and semantic AI neural classifiers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all text-xs font-semibold shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Custom Rule
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-white/10 gap-2 pb-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === 'all' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          All Rules ({rules.length})
        </button>
        <button
          onClick={() => setFilterType('regex')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === 'regex' 
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Regex DLP ({rules.filter(r => (r.pattern_type || r.type) === 'regex').length})
        </button>
        <button
          onClick={() => setFilterType('semantic')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterType === 'semantic' 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          Semantic AI ({rules.filter(r => (r.pattern_type || r.type) === 'semantic').length})
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-20 text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span>Loading detection rules...</span>
          </div>
        ) : (
          filteredRules.map(rule => {
            const isRegex = (rule.pattern_type || rule.type) === 'regex';
            return (
              <div key={rule.id} className={`glass-card p-5 transition-all duration-300 flex flex-col justify-between ${!rule.enabled ? 'opacity-50' : 'hover:-translate-y-1'}`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {isRegex ? (
                        <div className="p-1.5 rounded-md bg-blue-500/10 text-cyan-400 border border-cyan-500/20" title="Regex Rule">
                          <Regex className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20" title="Semantic Rule">
                          <Brain className="w-4 h-4" />
                        </div>
                      )}
                      <SeverityBadge severity={rule.severity} />
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleRule(rule.id, rule.enabled)}
                        title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                        className={`transition-colors cursor-pointer ${rule.enabled ? 'text-cyan-400' : 'text-slate-600'}`}
                      >
                        {rule.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        title="Delete Rule"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className={`font-semibold text-base mb-1 ${rule.enabled ? 'text-white' : 'text-slate-400'}`}>{rule.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{rule.description || "No description provided."}</p>
                </div>
                
                <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                  <div className="bg-[#0b1120] p-2 rounded text-[11px] font-mono text-slate-300 truncate border border-white/5" title={rule.pattern_value}>
                    <span className="text-slate-500 mr-1.5">{isRegex ? 'Regex:' : 'Phrase:'}</span>
                    {rule.pattern_value}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 rounded">
                      {isRegex ? 'Pattern Match' : 'Neural Similarity'}
                    </span>
                    <span className="font-mono">ID: #{rule.id}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 border border-white/15 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Add Custom Detection Rule
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateRule} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Rule Name *</label>
                <input 
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Stripe Secret Key Scanner"
                  className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Detection Engine *</label>
                  <select 
                    value={form.pattern_type}
                    onChange={e => setForm({...form, pattern_type: e.target.value})}
                    className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="regex">Regex (Pattern Match)</option>
                    <option value="semantic">Semantic AI (Embedding)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Severity *</label>
                  <select 
                    value={form.severity}
                    onChange={e => setForm({...form, severity: e.target.value})}
                    className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  {form.pattern_type === 'regex' ? 'Regex Pattern *' : 'Semantic Sensitive Phrase *'}
                </label>
                <input 
                  type="text"
                  required
                  value={form.pattern_value}
                  onChange={e => setForm({...form, pattern_value: e.target.value})}
                  placeholder={form.pattern_type === 'regex' ? "e.g. \\bsk_live_[0-9a-zA-Z]{24,}\\b" : "e.g. internal auth token secret"}
                  className="w-full font-mono bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Description</label>
                <textarea 
                  rows="2"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Optional brief description of what this rule detects..."
                  className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rules;
