import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell } from '../components/app/AuthShell';
import { fill } from '../components/dispatch/shared';
import { errorOf } from '../components/app/shared';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await authAPI.forgotPassword({ email: email.trim() }); setSent(true); }
    catch (e) { setErr(errorOf(e, t('ap.c.failed'))); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="box">
          <h1>{t('ap.s.sentT')}</h1>
          <p className="sub">{fill(t('ap.s.sentP'), { e: email.trim() })}</p>
          <Link to="/login" className="ap-btn ghost wide">{t('ap.s.back')}</Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1>{t('ap.s.forgotT')}</h1>
          <p className="sub">{t('ap.s.forgotP')}</p>
          <label className="ap-field">{t('ap.s.email')}
            <input className="ap-in" type="email" dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
          </label>
          {err && <div className="ap-error">{err}</div>}
          <button className="ap-btn wide" disabled={busy}>{t('ap.s.send')}</button>
          <div className="alt"><Link to="/login">{t('ap.s.back')}</Link></div>
        </form>
      )}
    </AuthShell>
  );
};
