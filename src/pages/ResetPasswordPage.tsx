import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, PasswordInput } from '../components/app/AuthShell';
import { errorOf } from '../components/app/shared';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const userId = params.get('userId') || '';
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== repeat) { setErr(t('ap.s.noMatch')); return; }
    setBusy(true); setErr('');
    try {
      await authAPI.resetPassword({ userId, token, newPassword: pw });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (e) {
      setErr(errorOf(e, t('ap.s.badLink')));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      {!userId || !token ? (
        <div className="box">
          <h1>{t('ap.s.resetT')}</h1>
          <p className="sub">{t('ap.s.badLink')}</p>
          <Link to="/forgot-password" className="ap-btn wide">{t('ap.s.newLink')}</Link>
        </div>
      ) : done ? (
        <div className="box">
          <h1>{t('ap.s.resetT')}</h1>
          <p className="sub">{t('ap.s.resetDone')}</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1>{t('ap.s.resetT')}</h1>
          <p className="sub">{t('ap.s.resetP')}</p>
          <label className="ap-field">{t('ap.c.new')}<PasswordInput autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8} autoFocus /></label>
          <label className="ap-field">{t('ap.c.rep')}<PasswordInput autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} required minLength={8} /></label>
          {err && <div className="ap-error">{err}</div>}
          <button className="ap-btn wide" disabled={busy}>{t('ap.s.reset')}</button>
          <div className="alt"><Link to="/login">{t('ap.s.back')}</Link></div>
        </form>
      )}
    </AuthShell>
  );
};
