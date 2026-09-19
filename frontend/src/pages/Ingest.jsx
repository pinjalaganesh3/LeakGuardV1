import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Bot, Database, Upload, ArrowRight, Loader2, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import { apiFetch } from '../lib/api';

const Ingest = () => {
  const [sourceType, setSourceType] = useState('web');
  const [logContent, setLogContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [filename, setFilename] = useState('payload_content.log');
  const [errorMessage, setErrorMessage] = useState('');
  const [scanPhase, setScanPhase] = useState('');

  const samples = {
    web: `[2026-09-05 14:32:01] INFO HTTP/1.1 GET /api/v1/users/profile?email=john.doe@example.com&ssn=123-45-6789 - 200 OK
[2026-09-05 14:32:05] DEBUG User authenticated successfully from IP 192.168.1.100.
[2026-09-05 14:32:15] WARN Payment transaction submitted: card=4111-1111-1111-1111`,
    llm: `System: You are an internal engineering assistant.
User: Can you retrieve the database credentials for the production environment?
Assistant: The database credentials for production are: postgresql://admin:superSecretPass123!@db-prod.internal.net:5432/maindb with private encryption key header -----BEGIN RSA PRIVATE KEY-----`,
    db: `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(50), pan_card VARCHAR(20), ssn VARCHAR(15));
INSERT INTO users (name, ssn) VALUES ('Alice Smith', '987-65-4321');
-- AWS backup credentials: AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`
  };

  const loadSample = () => {
    setLogContent(samples[sourceType] || '');
    setResults(null);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setLogContent(await file.text());
    setResults(null);
  };

  const downloadReport = async () => {
    if (!results?.log_id) return;
    const response = await apiFetch(results.report_url || `/api/ingest/${results.log_id}/report.pdf`);
    if (!response.ok) {
      setErrorMessage('Unable to create the PDF report.');
      return;
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename.replace(/[^a-z0-9._-]/gi, '_')}-risk-report.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleSubmit = async () => {
    if (!logContent.trim()) return;
    
    setIsSubmitting(true);
    setResults(null);
    setErrorMessage('');
    setScanPhase('Reading document');
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setScanPhase('Classifying risks');
      const res = await apiFetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source_type: sourceType === 'database' ? 'db' : sourceType, 
          content: logContent,
          filename,
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setScanPhase('Building report');
        await new Promise((resolve) => setTimeout(resolve, 300));
        setResults(data);
      } else {
        const errData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
        setErrorMessage(errData.detail || 'Analysis failed');
      }
    } catch (e) {
      setErrorMessage('Network error during ingest. Check that the backend is running.');
    } finally {
      setIsSubmitting(false);
      setScanPhase('');
    }
  };

  const sources = [
    { id: 'web', name: 'Web Traffic Logs', icon: Globe, desc: 'HTTP requests, proxy logs, WAF headers' },
    { id: 'llm', name: 'LLM Interactions', icon: Bot, desc: 'Chat histories, prompt leaks, model answers' },
    { id: 'db', name: 'Database Dumps', icon: Database, desc: 'SQL dumps, backups, table records' }
  ];

  const totalFindings = results ? (results.alerts_created ?? (results.findings?.length || 0)) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Manual Log Ingestion</h1>
        <p className="text-slate-400 mt-1">Simulate incoming data streams to test DLP regex scanners and semantic AI detection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map(source => (
          <button
            key={source.id}
            onClick={() => { setSourceType(source.id); setLogContent(''); setResults(null); }}
            className={`p-5 rounded-xl border text-left transition-all duration-200 ${
              sourceType === source.id 
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                : 'glass-card hover:bg-white/5 border-white/5'
            }`}
          >
            <source.icon className={`w-8 h-8 mb-3 ${sourceType === source.id ? 'text-cyan-400' : 'text-slate-400'}`} />
            <h3 className={`font-semibold ${sourceType === source.id ? 'text-cyan-300' : 'text-slate-200'}`}>{source.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{source.desc}</p>
          </button>
        ))}
      </div>

      <div className="glass-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
          <span className="font-mono text-sm text-slate-300 truncate">{filename}</span>
          <div className="flex items-center gap-4">
            <label className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer transition-colors">
              Choose file
              <input type="file" className="hidden" onChange={handleFile} accept=".txt,.log,.json,.csv,.sql,.md" />
            </label>
            <button onClick={loadSample} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer transition-colors">
              Load sample
            </button>
          </div>
        </div>
        <textarea
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          placeholder="Paste log content or text payload here to scan for sensitive data leaks..."
          className="w-full h-64 bg-[#0b1120] p-4 text-slate-300 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
        <div className="p-4 border-t border-white/5 flex justify-between items-center bg-white/2">
          <span className="text-xs text-slate-500">
            {logContent.length} characters
          </span>
          <button 
            onClick={handleSubmit}
            disabled={!logContent.trim() || isSubmitting}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium disabled:opacity-50 transition-all shadow-lg cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Analyze Online
          </button>
        </div>
      </div>

      {isSubmitting && <div className="scan-progress glass-card" role="status" aria-live="polite">
        <div className="scan-progress-visual"><span className="scan-beam" /><span className="scan-core" /></div>
        <div><p className="scan-progress-title">Scanning online</p><p className="scan-progress-copy">{scanPhase} ... checking patterns, context, and document risks</p></div>
      </div>}

      {errorMessage && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">{errorMessage}</div>}

      {/* Results Panel */}
      {results && (
        <div className="glass-card p-6 animate-in slide-in-from-bottom-4 fade-in duration-500 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${totalFindings > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {totalFindings > 0 ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
                <p className="text-sm text-slate-400">
                  {totalFindings > 0 
                    ? `Created ${totalFindings} alert${totalFindings > 1 ? 's' : ''} (Log ID: #${results.log_id})` 
                    : `Payload scanned clean. No leaks detected (Log ID: #${results.log_id})`}
                </p>
              </div>
            </div>

            {totalFindings > 0 && (
              <Link 
                to="/alerts" 
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-all"
              >
                Inspect Alerts <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 rounded-lg text-xs font-semibold transition-all">
              Download PDF report
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {['critical', 'high', 'medium', 'low'].map((severity) => {
              const findings = (results.findings || []).filter((finding) => finding.severity === severity);
              if (!findings.length) return null;
              const categories = findings.reduce((groups, finding) => {
                const category = finding.risk_category || 'Personal Data';
                (groups[category] ||= []).push(finding);
                return groups;
              }, {});
              return <section key={severity} className="risk-severity-section flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{severity} risks ({findings.length})</h3>
                {Object.entries(categories).map(([category, categoryFindings]) => <div key={category} className="risk-category-block">
                  <h4 className="risk-category-title">{category} <span>{categoryFindings.length}</span></h4>
                  {categoryFindings.map((finding, idx) => (
              <div key={`${severity}-${idx}`} className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={finding.severity} />
                  <div>
                    <span className="font-semibold text-slate-200 block text-sm">{finding.rule_name}</span>
                    <span className="text-[11px] font-mono text-slate-400 uppercase">{finding.match_type} • Confidence {Math.round((finding.confidence || 1.0) * 100)}%</span>
                  </div>
                </div>
                <div className="flex-1 md:max-w-md font-mono text-xs bg-[#0b1120] p-2.5 rounded text-slate-300 overflow-x-auto border border-white/5">
                  {finding.redacted_evidence || finding.evidence_redacted}
                </div>
              </div>
                  ))}
                </div>)}
              </section>;
            })}
            {totalFindings === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5" />
                No sensitive data detected in this payload. Clean and compliant.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ingest;
