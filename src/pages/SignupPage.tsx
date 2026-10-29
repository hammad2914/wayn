import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, PasswordInput } from '../components/app/AuthShell';
import { CountrySelect } from '../components/app/ui';
import { errorOf } from '../components/app/shared';
import type { User } from '../types';

export const SignupPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [f, setF] = useState({ fullName: '', companyName: '', email: '', phone: '', country: 'SA', password: '', repeat: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.repeat) { setErr(t('ap.s.noMatch')); return; }
    setBusy(true); setErr('');
    try {
      const res = await authAPI.signup({
        fullName: f.fullName.trim(), companyName: f.companyName.trim(), email: f.email.trim(),
        phone: f.phone.trim() || undefined, country: f.country, password: f.password,
      });
      const { token, user } = res.data.data as { token: string; user: User };
      login(token, user);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setErr(errorOf(e, t('ap.c.failed')));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h1>{t('ap.s.upT')}</h1>
        <p className="sub">{t('ap.s.upP')}</p>
        <div className="ap-two">
          <label className="ap-field">{t('ap.c.name')}<input className="ap-in" autoComplete="name" value={f.fullName} onChange={set('fullName')} required minLength={2} maxLength={80} autoFocus /></label>
          <label className="ap-field">{t('ap.c.company')}<input className="ap-in" autoComplete="organization" value={f.companyName} onChange={set('companyName')} required minLength={2} maxLength={80} /></label>
        </div>
        <label className="ap-field">{t('ap.s.email')}<input className="ap-in" type="email" dir="ltr" autoComplete="email" value={f.email} onChange={set('email')} placeholder="you@company.com" required /></label>
        <div className="ap-two">
          <label className="ap-field">{t('ap.s.phone')}<input className="ap-in num" dir="ltr" autoComplete="tel" value={f.phone} onChange={set('phone')} maxLength={30} /></label>
          <label className="ap-field">{t('ap.country')}<CountrySelect value={f.country} onChange={v => setF({ ...f, country: v })} lang={lang} /></label>
        </div>
        <label className="ap-field">{t('ap.s.pw')}<PasswordInput autoComplete="new-password" value={f.password} onChange={set('password')} required minLength={8} /><small>{t('ap.s.short')}</small></label>
        <label className="ap-field">{t('ap.s.pw2')}<PasswordInput autoComplete="new-password" value={f.repeat} onChange={set('repeat')} required minLength={8} /></label>
        {err && <div className="ap-error">{err}</div>}
        <button className="ap-btn wide" disabled={busy}>{t('ap.s.up')}</button>
        <div className="alt">{t('ap.s.have')} <Link to="/login">{t('ap.s.in')}</Link></div>
      </form>
    </AuthShell>
  );
};
