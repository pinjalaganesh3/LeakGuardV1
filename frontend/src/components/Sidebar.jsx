import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, ShieldAlert, Upload, Settings, ScrollText, UserCheck, Globe2, UsersRound, KeyRound } from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Alerts', path: '/alerts', icon: ShieldAlert },
    { name: 'Ingest', path: '/ingest', icon: Upload },
    { name: 'Rules', path: '/rules', icon: Settings },
    { name: 'Audit Log', path: '/audit', icon: ScrollText },
    { name: 'Consent', path: '/consent', icon: UserCheck },
    { name: 'Site Scanner', path: '/site-check', icon: Globe2 },
    { name: 'Security', path: '/security', icon: KeyRound },
  ];
  if (user?.role === 'admin') navItems.push({ name: 'Team Access', path: '/users', icon: UsersRound });

  return (
    <aside className="app-sidebar w-64 glass-panel h-screen flex flex-col fixed left-0 top-0 text-slate-300 z-10 transition-all duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <Shield className="text-cyan-400 w-8 h-8" />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
          LeakGuard
        </span>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="px-2 pb-1 text-xs text-slate-500 truncate">{user?.email}</div>
        <div className="px-2 pb-3 text-[10px] text-cyan-400 uppercase tracking-wider">{user?.role}</div>
        <button onClick={onLogout} className="w-full mb-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Sign out</button>
        <div className="flex items-center justify-center py-2 px-4 rounded-lg bg-white/5 text-xs text-slate-400">
          Version 1.0.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
