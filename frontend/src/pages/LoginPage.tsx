import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, PasswordInput } from '../components/app/AuthShell';
import { errorOf } from '../components/app/shared';
import type { User } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await authAPI.login({ email: email.trim(), password });
      const { token, user } = res.data.data as { token: string; user: User };
      login(token, user);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(errorOf(e, t('ap.s.fail')));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h1>{t('ap.s.in')}</h1>
        <p className="sub">{t('ap.s.inP')}</p>
        <label className="ap-field">{t('ap.s.email')}
          <input className="ap-in" type="email" dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
        </label>
        <label className="ap-field">
          <span className="row">{t('ap.s.pw')} <Link to="/forgot-password">{t('ap.s.forgot')}</Link></span>
          <PasswordInput autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {err && <div className="ap-error">{err}</div>}
        <button className="ap-btn wide" disabled={busy}>{t('ap.s.in')}</button>
        <div className="alt">{t('ap.s.new')} <Link to="/signup">{t('ap.s.create')}</Link></div>
      </form>
    </AuthShell>
  );
};
