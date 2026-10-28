import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import { tryAddress, type TryResponse } from '../../services/api';
import type { TranslationKey } from '../../translations';
import './tryIt.css';

// Visitors try the real engine on one address, through the public /engine/try endpoint
// (5 tries an hour each). Nothing here is canned: the examples run like typed input.
const EXAMPLES = [
  { text: 'ورا مسجد الراجحي، حي النسيم الغربي، فيلا ١٤، الرياض', country: 'SA', rtl: true },
  { text: 'olaya st near kingdom tower, building 7720, riyadh', country: 'SA', rtl: false },
  { text: 'حي الملقا، الرياض', country: 'SA', rtl: true },
  { text: 'Al Barsha, Dubai', country: 'AE', rtl: false },
];
const COUNTRIES = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'] as const;
const GULF = L.latLngBounds([[21, 39], [29.5, 58.5]]);
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';

type Precision = 'door' | 'place' | 'street' | 'district' | 'city';
const precisionOf = (type: string): Precision =>
  ['building', 'house'].includes(type) ? 'door'
  : ['road', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway', 'residential'].includes(type) ? 'street'
  : ['suburb', 'neighbourhood', 'quarter', 'city_district'].includes(type) ? 'district'
  : ['city', 'town', 'village', 'county', 'state', 'country'].includes(type) ? 'city' : 'place';
const PREC_KEY: Record<Precision, TranslationKey> = {
  door: 'wt.prec.door', place: 'hc.prec.place', street: 'hc.prec.street', district: 'hc.prec.district', city: 'wt.prec.city',
};

type State =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'error'; key: TranslationKey; signup: boolean }
  | { kind: 'done'; r: TryResponse; prec: Precision };

export const TryIt: React.FC = () => {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const [text, setText] = useState('');
  const [country, setCountry] = useState<string>('SA');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<{ map: L.Map; layer: L.LayerGroup } | null>(null);

  useEffect(() => {
    const m = L.map(mapEl.current!, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, zoomSnap: 0.25 });
    const opts = { maxNativeZoom: 16, maxZoom: 19, updateWhenZooming: false, keepBuffer: 4 };
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, opts).addTo(m);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { ...opts, opacity: 0.7 }).addTo(m);
    m.fitBounds(GULF);
    map.current = { map: m, layer: L.layerGroup().addTo(m) };
    return () => { m.remove(); map.current = null; };
  }, []);

  // pin the result: an area match is drawn as an area, not a door
  useEffect(() => {
    if (state.kind !== 'done' || !map.current || !state.r.geocoding) return;
    const { map: m, layer } = map.current, g = state.r.geocoding, at: L.LatLngTuple = [g.latitude, g.longitude];
    layer.clearLayers();
    if (state.prec === 'district')
      L.marker(at, { icon: L.divIcon({ className: '', html: '<div class="wt-area"></div>', iconSize: [150, 150], iconAnchor: [75, 75] }) }).addTo(layer);
    L.marker(at, { icon: L.divIcon({ className: '', html: '<div class="wt-pin"></div>', iconSize: [22, 22], iconAnchor: [11, 26] }) }).addTo(layer);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.flyTo(at, state.prec === 'district' ? 13.5 : state.prec === 'city' ? 11 : 15.5, { duration: reduce ? 0 : 1.4 });
  }, [state]);

  const run = async (address: string, c: string) => {
    if (address.trim().length < 3 || state.kind === 'working') return;
    setState({ kind: 'working' });
    try {
      const r = await tryAddress(address.trim(), c);
      if (r.error === 'try_limit' || r.error === 'try_busy') setState({ kind: 'error', key: `wt.${r.error}`, signup: true });
      else if (r.error === 'down') setState({ kind: 'error', key: 'wt.down', signup: false });
      else if (!r.success || !r.geocoding) setState({ kind: 'error', key: 'wt.noMatch', signup: false });
      else setState({ kind: 'done', r, prec: precisionOf(r.geocoding.accuracy) });
    } catch {
      setState({ kind: 'error', key: 'wt.down', signup: false });
    }
  };

  // a field in the page's language first, the other underneath when it differs
  const pair = (en: string | null, arV: string | null) => {
    if (!en && !arV) return null;
    const [main, other] = ar ? [arV || en, en] : [en || arV, arV];
    return <>{main}{other && other !== main && <span>{other}</span>}</>;
  };

  const done = state.kind === 'done' ? state : null;
  const check = done && (done.prec === 'district' || done.prec === 'city');
  const c = done?.r.components;
  const fields: [TranslationKey, React.ReactNode][] = c ? [
    ['wt.fBuilding', c.building_number], ['wt.fStreet', pair(c.street_name, c.street_name_ar)], ['wt.fArea', pair(c.area, c.area_ar)],
    ['wt.fCity', pair(c.city, c.city_ar)], ['wt.fPostal', c.postal_code],
  ] : [];

  return (
    <section id="try" className={`wt${check ? ' check' : ''}`}>
      <div className="wt-wrap">
        <div>
          <p className="wt-label">{t('wt.label')}</p>
          <h2>{t('wt.h2')}</h2>
          <p className="wt-intro">{t('wt.intro')}</p>
          <form className="wt-form" onSubmit={e => { e.preventDefault(); run(text, country); }}>
            <textarea className="wt-input" dir="auto" maxLength={160} required value={text}
              placeholder={t('wt.placeholder')} aria-label={t('wt.h2')} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(text, country); } }} />
            <div className="wt-row">
              <select className="wt-country" aria-label={t('wt.country')} value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(k => <option key={k} value={k}>{t(`wt.${k}`)}</option>)}
              </select>
              <button className="wt-go" type="submit" disabled={state.kind === 'working'}>{t('wt.go')}</button>
              <span className="wt-left">{t('wt.limit')}</span>
            </div>
          </form>
          <div className="wt-ex">
            <p>{t('wt.exTitle')}</p>
            {EXAMPLES.map(x => (
              <button key={x.text} type="button" dir={x.rtl ? 'rtl' : 'ltr'} disabled={state.kind === 'working'}
                onClick={() => { setText(x.text); setCountry(x.country); run(x.text, x.country); }}>{x.text}</button>
            ))}
          </div>
        </div>

        <div className="wt-out" aria-live="polite">
          <div className="wt-map" ref={mapEl} />
          <div className="wt-body">
            {state.kind === 'idle' && <p className="wt-status">{t('wt.idle')}</p>}
            {state.kind === 'working' && <p className="wt-status">{t('wt.working')}<span className="wt-dots"><i /><i /><i /></span></p>}
            {state.kind === 'error' && (
              <p className="wt-status err">{t(state.key)} {state.signup && <Link to="/signup">{t('wt.signup')}</Link>}</p>
            )}
            {done && c && (
              <div className="wt-result" key={done.r.original_address + done.r.processing_time_ms}>
                <div className="wt-lines"><p className="en" dir="ltr">{done.r.normalized_english}</p><p className="ar" dir="rtl">{done.r.normalized_address}</p></div>
                <div className="wt-conf">
                  <span>{t(PREC_KEY[done.prec])}</span>
                  {check && <span className="wt-flag">{t('wf.checkFirst')}</span>}
                  <span className="bar"><i style={{ width: `${done.r.confidence_score * 100}%` }} /></span>
                  <em>{Math.round(done.r.confidence_score * 100)}%</em>
                </div>
                <div className="wt-fields">
                  {fields.map(([k, v], i) => (
                    <div key={k} className={`wt-f${v ? '' : ' none'}`} style={{ animationDelay: `${120 + i * 70}ms` }}>
                      <small>{t(k)}</small><div>{v ?? '—'}</div>
                    </div>
                  ))}
                  {c.landmarks.length > 0 && (
                    <div className="wt-f wide note" style={{ animationDelay: `${120 + fields.length * 70}ms` }}>
                      <small>{t('wt.fNotes')}</small><div>{c.landmarks.join(' · ')}</div>
                    </div>
                  )}
                </div>
                <p className="wt-meta">{t('wt.took').replace('{s}', (done.r.processing_time_ms / 1000).toFixed(1))}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
