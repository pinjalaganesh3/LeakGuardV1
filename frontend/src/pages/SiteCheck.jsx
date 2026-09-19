import React, { useState } from 'react';
import { Globe2, Loader2, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import { apiFetch } from '../lib/api';

const SiteCheck = () => {
  const [url, setUrl] = useState('https://');
  const [maxPages, setMaxPages] = useState(5);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const scan = async (event) => {
    event.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await apiFetch('/api/site-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, max_pages: Number(maxPages) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Site scan failed');
      setResult(data);
    } catch (scanError) { setError(scanError.message); } finally { setLoading(false); }
  };

  return <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
    <div><p className="text-xs font-mono tracking-widest text-cyan-400">ANALYST TOOL / SURFACE SCAN</p><h1 className="text-3xl font-bold text-white tracking-tight mt-2">Scan a website</h1><p className="text-slate-400 mt-1">Check public pages on one domain for exposed secrets, PII, and sensitive content.</p></div>
    <form onSubmit={scan} className="glass-card p-5 flex flex-col md:flex-row gap-3">
      <div className="relative flex-1"><Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="w-full bg-[#0b1120] border border-white/10 rounded-lg pl-10 pr-3 py-3 text-sm text-white" placeholder="https://example.com" /></div>
      <select value={maxPages} onChange={(event) => setMaxPages(event.target.value)} className="bg-[#0b1120] border border-white/10 rounded-lg px-3 text-sm text-slate-300"><option value="1">1 page</option><option value="5">5 pages</option><option value="10">10 pages</option></select>
      <button disabled={loading} className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={17} /> : <Globe2 size={17} />} {loading ? 'Scanning...' : 'Scan site'}</button>
    </form>
    {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">{error}</div>}
    {result && <div className="glass-card p-5 flex flex-col gap-5"><div className="flex items-center gap-3"><div className={`p-3 rounded-full ${result.alerts_created ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{result.alerts_created ? <ShieldAlert /> : <ShieldCheck />}</div><div><h2 className="text-lg font-semibold text-white">Scan complete</h2><p className="text-sm text-slate-400">Checked {result.pages_checked} page{result.pages_checked === 1 ? '' : 's'} and found {result.alerts_created} alert{result.alerts_created === 1 ? '' : 's'}.</p></div></div>{result.pages.map((page) => <div key={page.url} className="border-t border-white/10 pt-4"><div className="flex justify-between gap-3"><a className="text-cyan-300 text-sm truncate flex items-center gap-2" href={page.url} target="_blank" rel="noreferrer">{page.url} <ExternalLink size={13} /></a><span className="text-xs text-slate-500">HTTP {page.status_code}</span></div>{page.findings.length ? <div className="mt-3 flex flex-col gap-2">{page.findings.map((finding, index) => <div key={`${finding.rule_name}-${index}`} className="flex items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-lg"><span className="text-sm text-slate-200">{finding.rule_name}</span><SeverityBadge severity={finding.severity} /></div>)}</div> : <p className="mt-3 text-sm text-emerald-400">No sensitive findings on this page.</p>}</div>)}</div>}
  </div>;
};

export default SiteCheck;