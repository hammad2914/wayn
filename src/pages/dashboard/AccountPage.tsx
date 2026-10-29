import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUsage } from '../../hooks/useUsage';
import { useLanguage } from '../../contexts/LanguageContext';
import { fill } from '../../components/dispatch/shared';
import { errorOf } from '../../components/app/shared';
import { CountrySelect, LangSwitch } from '../../components/app/ui';

const Meter: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => {
  const { t } = useLanguage();
  return (
    <div className={`ap-meter${used >= limit ? ' full' : ''}`}>
      <span>{label}</span><span className="num">{fill(t('ap.c.of'), { a: used, b: limit })}</span>
      <div className="t"><b style={{ width: `${Math.min(100, (used / Math.max(limit, 1)) * 100)}%` }} /></div>
    </div>
  );
};

/** A small "Saved" or error note next to a form's button */
const Note: React.FC<{ msg: { ok: boolean; text: string } | null }> = ({ msg }) =>
  msg ? <span style={{ fontSize: 13, color: msg.ok ? 'var(--ok)' : 'var(--warn)' }}>{msg.text}</span> : null;

export const AccountPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, refreshUser, logout } = useAuth();
  const { usage } = useUsage();
  const navigate = useNavigate();

  const [p, setP] = useState({ fullName: '', companyName: '', phone: '', country: 'SA' });
  const [pBusy, setPBusy] = useState(false);
  const [pMsg, setPMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ cur: '', next: '', rep: '' });
  const [wBusy, setWBusy] = useState(false);
  const [wMsg, setWMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) setP({ fullName: user.fullName ?? '', companyName: user.companyName ?? '', phone: (user as { phone?: string }).phone ?? '', country: user.country || 'SA' });
  }, [user]);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPBusy(true); setPMsg(null);
    try {
      await authAPI.updateProfile({ fullName: p.fullName.trim(), companyName: p.companyName.trim(), phone: p.phone.trim() || undefined, country: p.country });
      await refreshUser();
      setPMsg({ ok: true, text: t('ap.c.saved') });
    } catch (err) { setPMsg({ ok: false, text: errorOf(err, t('ap.c.failed')) }); }
    finally { setPBusy(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.rep) { setWMsg({ ok: false, text: t('ap.s.noMatch') }); return; }
    setWBusy(true); setWMsg(null);
    try {
      await authAPI.changePassword({ currentPassword: pw.cur, newPassword: pw.next });
      setPw({ cur: '', next: '', rep: '' });
      setWMsg({ ok: true, text: t('ap.c.changed') });
    } catch (err) { setWMsg({ ok: false, text: errorOf(err, t('ap.c.failed')) }); }
    finally { setWBusy(false); }
  };

  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="ap-page">
      <div className="ap-title"><div><h1>{t('ap.account')}</h1><p>{t('ap.c.sub')}</p></div></div>
      <div className="ap-acct">
        <div className="ap-card ap-sec">
          <div><h2>{t('ap.c.profile')}</h2><p>{t('ap.c.profileP')}</p></div>
          <form onSubmit={saveProfile}>
            <div className="ap-two">
              <label className="ap-field">{t('ap.c.name')}<input className="ap-in" value={p.fullName} onChange={e => setP({ ...p, fullName: e.target.value })} required minLength={2} maxLength={80} /></label>
              <label className="ap-field">{t('ap.c.company')}<input className="ap-in" value={p.companyName} onChange={e => setP({ ...p, companyName: e.target.value })} required minLength={2} maxLength={80} /></label>
            </div>
            <div className="ap-two">
              <label className="ap-field">{t('ap.c.phone')}<input className="ap-in num" dir="ltr" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} placeholder="+966 5x xxx xxxx" maxLength={30} /></label>
              <label className="ap-field">{t('ap.country')}<CountrySelect value={p.country} onChange={v => setP({ ...p, country: v })} lang={lang} /></label>
            </div>
            <label className="ap-field">{t('ap.c.email')}<input className="ap-in" dir="ltr" value={user.email} disabled /><small>{t('ap.c.emailP')}</small></label>
            <div className="acts"><Note msg={pMsg} /><button className="ap-btn" disabled={pBusy}>{t('ap.c.save')}</button></div>
          </form>
        </div>

        {usage && (
          <div className="ap-card ap-sec">
            <div><h2>{t('ap.c.plan')}</h2><p>{t('ap.c.planP')}</p></div>
            <div className="ap-plan">
              <Meter label={t('ap.c.addr')} used={usage.addressNormalizerCount} limit={usage.addressNormalizerLimit} />
              <Meter label={t('ap.c.routes')} used={usage.routeOptimizerCount} limit={usage.routeOptimizerLimit} />
              <p>{t('ap.c.today')}</p>
            </div>
          </div>
        )}

        <div className="ap-card ap-sec">
          <div><h2>{t('ap.c.pw')}</h2><p>{t('ap.c.pwP')}</p></div>
          <form onSubmit={savePassword}>
            <label className="ap-field">{t('ap.c.cur')}<input className="ap-in" type="password" autoComplete="current-password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} required /></label>
            <div className="ap-two">
              <label className="ap-field">{t('ap.c.new')}<input className="ap-in" type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required minLength={8} /></label>
              <label className="ap-field">{t('ap.c.rep')}<input className="ap-in" type="password" autoComplete="new-password" value={pw.rep} onChange={e => setPw({ ...pw, rep: e.target.value })} required minLength={8} /></label>
            </div>
            <div className="acts"><Note msg={wMsg} /><button className="ap-btn ghost" disabled={wBusy}>{t('ap.c.change')}</button></div>
          </form>
        </div>

        <div className="ap-card ap-sec">
          <div><h2>{t('ap.c.session')}</h2>{since && <p>{fill(t('ap.c.since'), { d: since })}</p>}</div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="ap-kv">
              <span>{fill(t('ap.c.as'), { e: user.email })}</span>
              <button className="ap-btn ghost danger" onClick={() => { logout(); navigate('/'); }}>{t('ap.signOut')}</button>
            </div>
            <LangSwitch />
          </div>
        </div>
      </div>
    </div>
  );
};
