import React, { useState } from 'react';
import { Shield, LockKeyhole, Mail, UserRound, ArrowRight, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { apiFetch } from '../lib/api';

const Auth = ({ onAuthenticated }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requiresOtp, setRequiresOtp] = useState(false);

  const isSignup = mode === 'signup';

  const getErrorMessage = (data) => {
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => item.msg).filter(Boolean).join('. ');
    }
    return data.detail || 'Unable to authenticate';
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setRequiresOtp(false);
    try {
      const response = await apiFetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = getErrorMessage(data);
        if (detail?.toLowerCase().includes('two-factor')) setRequiresOtp(true);
        throw new Error(detail);
      }
      onAuthenticated(data);
    } catch (submitError) {
      setError(submitError instanceof TypeError
        ? 'LeakGuard API is unavailable. Start the backend on port 8000 and try again.'
        : submitError.message || 'Unable to authenticate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-brand"><Shield size={28} /><span>LeakGuard</span></div>
        <div className="auth-copy">
          <p className="auth-kicker">Private by design</p>
          <h1>Your security workspace stays on your machine.</h1>
          <p>Protect logs, alerts, consent records, and detection rules in a local-first control room with no third-party account required.</p>
        </div>
        <div className="auth-proof"><Fingerprint size={18} /><span>Passwords are hashed locally. Sessions never leave this app.</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top"><span className="auth-eyebrow">SECURE ACCESS</span><LockKeyhole size={18} /></div>
        <h2>{isSignup ? 'Create your workspace' : 'Welcome back'}</h2>
        <p className="auth-subtitle">{isSignup ? 'Start with a private local account.' : 'Sign in to your protected security console.'}</p>

        <div className="auth-switcher" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {isSignup && <label><span>Name</span><div className="auth-input"><UserRound size={17} /><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" autoComplete="name" /></div></label>}
          <label><span>Email</span><div className="auth-input"><Mail size={17} /><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" autoComplete="email" /></div></label>
          <label><span>Password</span><div className="auth-input"><LockKeyhole size={17} /><input required minLength="8" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" autoComplete={isSignup ? 'new-password' : 'current-password'} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {requiresOtp && <label><span>Two-factor code</span><div className="auth-input"><Fingerprint size={17} /><input required value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value })} placeholder="6-digit authenticator code" inputMode="numeric" /></div></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={submitting}>{submitting ? 'Securing session...' : isSignup ? 'Create private account' : 'Enter LeakGuard'} <ArrowRight size={17} /></button>
        </form>
        <p className="auth-note">No analytics. No external identity provider. Your account is stored in the local LeakGuard database.</p>
      </section>
    </main>
  );
};

export default Auth;