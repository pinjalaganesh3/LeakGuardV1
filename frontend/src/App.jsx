import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Ingest from './pages/Ingest';
import Rules from './pages/Rules';
import AuditLog from './pages/AuditLog';
import Consent from './pages/Consent';
import Auth from './pages/Auth';
import SiteCheck from './pages/SiteCheck';
import Users from './pages/Users';
import Security from './pages/Security';
import { apiFetch } from './lib/api';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const handleApiError = (event) => setApiError(event.detail);
    window.addEventListener('leakguard:api-error', handleApiError);
    apiFetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
    return () => window.removeEventListener('leakguard:api-error', handleApiError);
  }, []);

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  if (checkingSession) return <div className="auth-loading">Opening your private workspace...</div>;
  if (!user) return <Auth onAuthenticated={setUser} />;

  return (
    <Router>
      <div className="app-shell flex min-h-screen w-full text-slate-300">
        {apiError && <div className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-rose-500/30 bg-rose-950/95 px-4 py-3 text-sm text-rose-200 shadow-xl" role="alert">{apiError}</div>}
        <Sidebar user={user} onLogout={logout} />
        <main className="app-main flex-1 ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/ingest" element={<Ingest />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/site-check" element={<SiteCheck />} />
            <Route path="/security" element={<Security />} />
            {user.role === 'admin' && <Route path="/users" element={<Users />} />}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
