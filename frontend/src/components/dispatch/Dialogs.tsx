import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { dispatchAPI, messageOf, type Order, type Today, type VanInput } from '../../services/dispatch';
import { useLanguage } from '../../contexts/LanguageContext';
import { TILES, fill, parseOrders } from './shared';

const Dialog: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="dp-modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dp-dialog" role="dialog" aria-modal="true">{children}</div>
    </div>
  );
};

// ── Add orders ────────────────────────────────────────────────────────────────

const COUNTRIES = [['SA', 'Saudi Arabia', 'السعودية'], ['AE', 'UAE', 'الإمارات'], ['KW', 'Kuwait', 'الكويت'],
  ['QA', 'Qatar', 'قطر'], ['BH', 'Bahrain', 'البحرين'], ['OM', 'Oman', 'عُمان']];

export const AddOrders: React.FC<{ country: string | null; onClose: () => void; onDone: () => void }> = ({ country, onClose, onDone }) => {
  const { t, lang } = useLanguage();
  const [text, setText] = useState('');
  const [cc, setCc] = useState(country && COUNTRIES.some(c => c[0] === country) ? country : 'SA');
  const [city, setCity] = useState(() => { try { return localStorage.getItem('wayn-city') ?? ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const rows = useMemo(() => parseOrders(text), [text]);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      for (let i = 0; i < rows.length; i += 100) {
        await dispatchAPI.addOrders({ country: cc, city: city.trim() || undefined, orders: rows.slice(i, i + 100) });
      }
      try { localStorage.setItem('wayn-city', city.trim()); } catch { /* private mode */ }
      onDone();
    } catch (e) {
      setErr(messageOf(e, t('dp.add.fail')));
      setBusy(false);
    }
  };

  return (
    <Dialog onClose={onClose}>
      <h3>{t('dp.add.t')}</h3>
      <p>{t('dp.add.p')}</p>
      <div className="dp-two">
        <label className="dp-field">{t('dp.add.country')}
          <select value={cc} onChange={e => setCc(e.target.value)}>
            {COUNTRIES.map(([code, en, ar]) => <option key={code} value={code}>{lang === 'ar' ? ar : en}</option>)}
          </select>
        </label>
        <label className="dp-field">{t('dp.add.city')}
          <input value={city} onChange={e => setCity(e.target.value)} placeholder={lang === 'ar' ? 'الرياض' : 'Riyadh'} maxLength={60} />
          <small>{t('dp.add.cityHint')}</small>
        </label>
      </div>
      <label className="dp-field">
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('dp.add.paste')} autoFocus spellCheck={false} />
        <small>{t('dp.add.noCols')}</small>
      </label>
      {rows.length > 0 && (
        <>
          <div className="dp-warn" style={{ color: 'var(--muted)' }}>{fill(t('dp.add.found'), { n: rows.length })}</div>
          <div className="dp-preview">
            {rows.slice(0, 50).map((r, i) => <div key={i}><span>{r.customer}</span><span>{r.text}</span><span className="num">{r.kg ?? ''}</span></div>)}
          </div>
        </>
      )}
      <div className="dp-foot">
        {err && <span className="err">{err}</span>}
        <button className="dp-btn ghost" onClick={onClose}>{t('dp.cancel')}</button>
        <button className="dp-btn" disabled={!rows.length || busy} onClick={submit}>{fill(t('dp.add.go'), { n: rows.length })}</button>
      </div>
    </Dialog>
  );
};

// ── Plan the run ──────────────────────────────────────────────────────────────

/** The next quarter hour, as the default departure */
const soon = () => {
  const d = new Date(Date.now() + 15 * 60e3);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const PlanRun: React.FC<{ today: Today; onClose: () => void; onDone: (note?: string) => void }> = ({ today, onClose, onDone }) => {
  const { t } = useLanguage();
  const last = today.last;
  const [depot, setDepot] = useState(last?.depot.address ?? '');
  const [start, setStart] = useState(soon);
  const [vans, setVans] = useState<VanInput[]>(last?.vans.length ? last.vans : [{ driver: '', capacity: 500 }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const started = today.orders.some(o => o.runId && o.deliveredAt);
  const placeable = today.orders.filter(o => (o.state === 'ready' || o.state === 'check') && o.lat != null && (!started || !o.runId)).length;
  const waiting = today.orders.filter(o => o.state === 'pin' || o.state === 'cleaning').length;
  const set = (i: number, v: Partial<VanInput>) => setVans(vs => vs.map((x, j) => (j === i ? { ...x, ...v } : x)));

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      // the same depot as last time needs no new map search
      const same = last && last.depot.address === depot.trim();
      const r = await dispatchAPI.planRun({
        depot: same ? last!.depot : { address: depot.trim() },
        vans: vans.map((v, i) => ({ driver: v.driver.trim() || fill(t('dp.van'), { n: i + 1 }), capacity: v.capacity })),
        start,
      });
      onDone(r.unassigned.length ? fill(t('dp.plan.over'), { n: r.unassigned.length }) : undefined);
    } catch (e) {
      setErr(messageOf(e, t('dp.plan.fail')));
      setBusy(false);
    }
  };

  return (
    <Dialog onClose={busy ? () => {} : onClose}>
      <h3>{t('dp.plan.t')}</h3>
      <p>{fill(t('dp.plan.p'), { n: placeable })} {waiting > 0 && fill(t('dp.plan.left'), { n: waiting })}</p>
      {today.runs.length > 0 && !started && <div className="dp-warn">{t('dp.plan.replace')}</div>}
      <div className="dp-two" style={{ gridTemplateColumns: '1fr 140px' }}>
        <label className="dp-field">{t('dp.plan.depot')}
          <input value={depot} onChange={e => setDepot(e.target.value)} placeholder="Al Sulay, Riyadh" dir="auto" />
        </label>
        <label className="dp-field">{t('dp.plan.start')}
          <input type="time" value={start} onChange={e => setStart(e.target.value)} />
        </label>
      </div>
      <div className="dp-field">{t('dp.plan.vans')}</div>
      <div className="dp-vanrow" style={{ marginTop: 6, fontSize: 12, color: 'var(--faint)' }}><span>{t('dp.plan.driver')}</span><span>{t('dp.plan.capacity')}</span><span /></div>
      {vans.map((v, i) => (
        <div className="dp-vanrow" key={i}>
          <input value={v.driver} onChange={e => set(i, { driver: e.target.value })} placeholder={fill(t('dp.van'), { n: i + 1 })} maxLength={60} />
          <input type="number" min={1} value={v.capacity} onChange={e => set(i, { capacity: Number(e.target.value) })} />
          <button aria-label={t('dp.remove')} disabled={vans.length === 1} onClick={() => setVans(vs => vs.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {vans.length < 10 && (
        <button className="dp-mini" style={{ marginTop: 10 }} onClick={() => setVans(vs => [...vs, { driver: '', capacity: vs.at(-1)?.capacity ?? 500 }])}>+ {t('dp.plan.addVan')}</button>
      )}
      <div className="dp-foot">
        {err && <span className="err">{err}</span>}
        <button className="dp-btn ghost" disabled={busy} onClick={onClose}>{t('dp.cancel')}</button>
        <button className="dp-btn" disabled={busy || !placeable || depot.trim().length < 3 || vans.some(v => !(v.capacity > 0))} onClick={submit}>
          {busy ? t('dp.plan.busy') : t('dp.plan.go')}
        </button>
      </div>
    </Dialog>
  );
};

// ── Drop a pin ────────────────────────────────────────────────────────────────

export const PinOrder: React.FC<{ order: Order; near: { lat: number; lng: number } | null; onClose: () => void; onDone: () => void }> = ({ order, near, onClose, onDone }) => {
  const { t } = useLanguage();
  const el = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ lat: number; lng: number } | null>(order.state === 'check' && order.lat != null ? { lat: order.lat, lng: order.lng! } : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const start = order.lat != null ? { lat: order.lat, lng: order.lng! } : near ?? { lat: 24.71, lng: 46.68 };
    const m = L.map(el.current!, { attributionControl: false, zoomSnap: 0.5 }).setView([start.lat, start.lng], order.state === 'check' ? 15 : 12);
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }).addTo(m);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19, opacity: 0.6 }).addTo(m);
    const pin = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="dp-pin" style="width:18px;height:18px;background:#F5C842"></div>', iconSize: [18, 18] }) });
    if (order.state === 'check' && order.lat != null) pin.setLatLng([order.lat, order.lng!]).addTo(m);
    m.on('click', e => { pin.setLatLng(e.latlng).addTo(m); setAt({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    return () => { m.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- built once; later refreshes must not reset the pin

  const save = async () => {
    if (!at) return;
    setBusy(true); setErr('');
    try { await dispatchAPI.pin(order.id, at.lat, at.lng); onDone(); }
    catch (e) { setErr(messageOf(e, t('dr.fail'))); setBusy(false); }
  };

  return (
    <Dialog onClose={onClose}>
      <h3>{fill(t('dp.pin.t'), { c: order.customer })}</h3>
      <p dir="auto">“{order.text}”</p>
      <p>{t('dp.pin.p')}</p>
      <div className="dp-pinmap" ref={el} />
      <div className="dp-foot">
        {err && <span className="err">{err}</span>}
        <button className="dp-btn ghost" onClick={onClose}>{t('dp.cancel')}</button>
        <button className="dp-btn" disabled={!at || busy} onClick={save}>{t('dp.save')}</button>
      </div>
    </Dialog>
  );
};
