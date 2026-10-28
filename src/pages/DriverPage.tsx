import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { driverAPI, type DriverRun, type DriverStop } from '../services/dispatch';
import { useLanguage } from '../contexts/LanguageContext';
import { LangToggle } from '../components/ui/LangToggle';
import { WaynLogo } from '../components/ui/WaynLogo';
import { clock, fill } from '../components/dispatch/shared';
import '../components/dispatch/dispatch.css';

// The driver's link: today's stops for one van, in driving order. No sign-in; the link is the key.
export const DriverPage: React.FC = () => {
  const { token = '' } = useParams();
  const { t, lang } = useLanguage();
  const [run, setRun] = useState<DriverRun | null>(null);
  const [state, setState] = useState<'loading' | 'bad' | 'ok'>('loading');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setRun(await driverAPI.run(token)); setState('ok'); }
    catch { setState('bad'); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const mark = async (s: DriverStop, delivered: boolean) => {
    setBusy(s.id); setErr('');
    try {
      const r = await driverAPI.mark(token, s.id, delivered);
      setRun(prev => prev && { ...prev, stops: prev.stops.map(x => (x.id === s.id ? { ...x, deliveredAt: r.deliveredAt } : x)) });
    } catch { setErr(t('dr.fail')); }
    finally { setBusy(''); }
  };

  const left = run?.stops.filter(s => !s.deliveredAt).length ?? 0;
  const next = run?.stops.find(s => !s.deliveredAt);

  return (
    <div className="dr">
      <header className="dr-top">
        <WaynLogo size={22} markOnly />
        <div className="dr-who">
          <b>{run?.company ?? 'Wayn'}</b>
          {run && <span>{fill(t('dr.van'), { n: run.van, d: run.driver })}</span>}
        </div>
        <LangToggle variant="minimal" />
      </header>

      {state === 'loading' && <p className="dr-msg">…</p>}
      {state === 'bad' && <p className="dr-msg">{t('dr.bad')}</p>}
      {state === 'ok' && run && (
        <main className="dr-main">
          <div className="dr-sum">
            <h1>{t('dr.title')}</h1>
            <span className="num">{left ? fill(t('dr.left'), { n: left, m: run.stops.length }) : ''}</span>
          </div>
          {!left && <p className="dr-done">{t('dr.done')}</p>}
          {err && <p className="dr-err">{err}</p>}
          <ol className="dr-stops">
            {run.stops.map(s => {
              const done = !!s.deliveredAt, address = (lang === 'ar' ? s.ar : s.en) || s.text;
              return (
                <li key={s.id} className={`dr-stop ${done ? 'done' : ''} ${next?.id === s.id ? 'next' : ''}`}>
                  <div className="dr-h">
                    <span className="dr-n">{done ? '✓' : s.seq}</span>
                    <div className="dr-c"><b>{s.customer}</b><span className="num">{s.kg} kg</span></div>
                    <span className="dr-eta num">{done ? fill(t('dr.delivered'), { t: clock(s.deliveredAt!, lang) }) : s.eta ? fill(t('dr.expected'), { t: clock(s.eta, lang) }) : ''}</span>
                  </div>
                  <div className="dr-addr" dir="auto">{address}</div>
                  {!done && <>
                    <div className="dr-k">{t('dr.typed')}</div><div className="dr-typed" dir="auto">“{s.text}”</div>
                    {s.notes.length > 0 && <><div className="dr-k">{t('dr.notes')}</div><div dir="auto">{s.notes.join(' · ')}</div></>}
                  </>}
                  <div className="dr-acts">
                    {done ? (
                      <button className="dp-mini quiet" disabled={busy === s.id} onClick={() => mark(s, false)}>{t('dr.undo')}</button>
                    ) : <>
                      {s.phone && <a className="dp-btn ghost" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>{t('dr.call')}</a>}
                      {s.lat != null && <a className="dp-btn ghost" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">{t('dr.navigate')}</a>}
                      <button className="dp-btn" disabled={busy === s.id} onClick={() => mark(s, true)}>{t('dr.deliver')}</button>
                    </>}
                  </div>
                </li>
              );
            })}
          </ol>
        </main>
      )}
    </div>
  );
};
