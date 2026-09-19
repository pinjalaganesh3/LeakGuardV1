import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserRound, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const load = () => apiFetch('/api/auth/users').then((response) => response.json()).then(setUsers).catch((loadError) => setError(loadError.message));
  useEffect(load, []);
  const changeRole = async (id, role) => { try { await apiFetch(`/api/auth/users/${id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }); load(); } catch (error) { setError(error.message); } };
  return <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6"><div className="flex justify-between items-center"><div><p className="text-xs font-mono tracking-widest text-amber-400">ADMIN CONSOLE</p><h1 className="text-3xl font-bold text-white mt-2">Team access</h1><p className="text-slate-400 mt-1">Manage who can investigate and administer this workspace.</p></div><button onClick={load} className="p-2 text-slate-400 hover:text-white"><RefreshCw size={18} /></button></div>{error && <p className="text-rose-300 text-sm">{error}</p>}<div className="glass-card divide-y divide-white/10">{users.map((user) => <div key={user.id} className="p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-cyan-500/10 text-cyan-400"><UserRound size={18} /></div><div><p className="text-sm font-semibold text-white">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div><div className="flex items-center gap-3"><span className="text-xs text-slate-400 flex items-center gap-1"><ShieldCheck size={14} /> {user.role}</span><select value={user.role} onChange={(event) => changeRole(user.id, event.target.value)} className="bg-[#0b1120] border border-white/10 rounded px-2 py-1 text-xs text-slate-300"><option value="analyst">Analyst</option><option value="admin">Admin</option></select></div></div>)}</div></div>;
};

export default Users;