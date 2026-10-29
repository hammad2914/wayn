import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { normalizeAddress } from '../../services/api';
import { useUsage } from '../../hooks/useUsage';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { baseMap, divIcon, matchOf, matchTone, errorOf, COUNTRIES, type Match } from '../../components/app/shared';
import { CountrySelect } from '../../components/app/ui';
import type { NormalizeResponse } from '../../types';

const EXAMPLES: [string, string, string][] = [
  ['ورا مسجد الراجحي، حي النسيم الغربي، فيلا رقم ١٤ البوابة السودا، الرياض', 'SA', 'Riyadh'],
  ['olaya st near kingdom tower, building 7720, riyadh', 'SA', 'Riyadh'],
  ['حي الملقا، شارع أنس بن مالك، الرياض', 'SA', 'Riyadh'],
  ['شارع الشيخ زايد، قرب برج خليفة، دبي', 'AE', 'Dubai'],
  ['حي السليمانية، شارع العروبة، جدة', 'SA', 'Jeddah'],
];

// The recent list lives in the usage activity: each clean saves what went in and what came out
interface Saved { t: string; en: string; m: Match }
const parseSaved = (s: string | null): Saved | null => {
  try { const v = JSON.parse(s ?? ''); return v && typeof v.t === 'string' ? v : null; } catch { return null; }
};

const Copy: React.FC<{ text: string }> = ({ text }) => {
  const { t } = useLanguage();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="ap-mini" onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
    }}>{done ? t('ap.a.copied') : t('ap.a.copy')}</button>
  );
};

const ResultMap: React.FC<{ lat: number; lng: number; match: Match }> = ({ lat, lng, match }) => {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const m = baseMap(el.current!, { zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(m);
    // a district or city match is only roughly there: show the area, not just a point
    if (match === 'district' || match === 'city') {
      L.circle([lat, lng], { radius: match === 'city' ? 3000 : 450, color: '#F0A54A', weight: 1, fillOpacity: 0.06, dashArray: '4 4' }).addTo(m);
    }
    L.marker([lat, lng], { icon: divIcon('<div class="ap-pin"></div>', 18) }).addTo(m);
    m.setView([lat, lng], match === 'city' ? 12 : match === 'district' ? 15 : 16);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); };
  }, [lat, lng, match]);
  return <div className="ap-amap" ref={el} />;
};

export const AddressesPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { canUseNormalizer, increment, activity } = useUsage();
  const [text, setText] = useState('');
  const [country, setCountry] = useState(() => COUNTRIES.some(c => c[0] === user?.country) ? user!.country! : 'SA');
  const [city, setCity] = useState(() => { try { return localStorage.getItem('wayn-city') ?? ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<NormalizeResponse | null>(null);

  const recent = useMemo(() => activity.filter(a => a.service === 'address_normalizer')
    .map(a => ({ id: a.id, s: parseSaved(a.summary) })).filter(a => a.s).slice(0, 5) as { id: string; s: Saved }[], [activity]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUseNormalizer) { setErr(t('ap.a.limit')); return; }
    setBusy(true); setErr(''); setRes(null);
    try {
      const named = city.trim() && text.toLowerCase().includes(city.trim().toLowerCase());
      const r = await normalizeAddress({
        address: city.trim() && !named ? `${text.trim()}, ${city.trim()}` : text.trim(),
        country, use_ai: false, include_geocoding: true, use_cache: true,
      });
      if (!r.success) { setErr(t('ap.a.fail')); return; }
      setRes(r);
      try { localStorage.setItem('wayn-city', city.trim()); } catch { /* private mode */ }
      // counted only once it worked, and saved for the recent list
      const saved: Saved = { t: text.trim().slice(0, 200), en: r.normalized_english.slice(0, 200), m: matchOf(r.geocoding?.accuracy) };
      const { limitReached } = await increment('address_normalizer', JSON.stringify(saved));
      if (limitReached) setErr(t('ap.a.limit'));
    } catch (e) {
      setErr(errorOf(e, t('ap.a.fail')));
    } finally { setBusy(false); }
  };

  const example = () => {
    const pick = EXAMPLES.filter(x => x[0] !== text)[Math.floor(Math.random() * (EXAMPLES.length - 1))];
    setText(pick[0]); setCountry(pick[1]); setCity(pick[2]);
  };

  const match = res ? matchOf(res.geocoding?.accuracy) : null;
  const c = res?.components;

  return (
    <div className="ap-page">
      <div className="ap-title">
        <div><h1>{t('ap.addresses')}</h1><p>{t('ap.a.sub')}</p></div>
      </div>

      <div className="ap-addr">
        <div className="ap-card">
          <form onSubmit={submit}>
            <h2>{t('ap.a.label')} <button type="button" className="ap-mini" onClick={example}>{t('ap.a.example')}</button></h2>
            <textarea className="ap-in" dir="auto" value={text} onChange={e => setText(e.target.value)} placeholder={t('ap.a.ph')} maxLength={300} required minLength={3} />
            <div className="ap-two">
              <label className="ap-field">{t('ap.country')}<CountrySelect value={country} onChange={setCountry} lang={lang} /></label>
              <label className="ap-field">{t('ap.city')}
                <input className="ap-in" value={city} onChange={e => setCity(e.target.value)} placeholder={lang === 'ar' ? 'الرياض' : 'Riyadh'} maxLength={60} />
                <small>{t('ap.a.cityHint')}</small>
              </label>
            </div>
            {err && <div className="ap-error">{err}</div>}
            <button className="ap-btn wide" disabled={busy || text.trim().length < 3 || !canUseNormalizer}>{busy ? t('ap.a.busy') : t('ap.a.go')}</button>
          </form>
        </div>

        <div className="ap-card ap-res">
          {busy ? (
            <div className="ap-busy"><div className="bar"><b /></div>{t('ap.a.busy')}</div>
          ) : !res || !match ? (
            <div className="ap-empty"><b>{t('ap.a.emptyT')}</b>{t('ap.a.emptyP')}</div>
          ) : (
            <>
              <div className="top">
                <h2>{t('ap.a.result')} <span className={`ap-pill ${matchTone(match)}`}><i />{t(`ap.m.${match}` as const)}</span></h2>
                <div className="ap-lines">
                  <div className="ap-line"><span>EN</span><div>{res.normalized_english}</div><Copy text={res.normalized_english} /></div>
                  <div className="ap-line"><span>ع</span><div dir="rtl">{res.normalized_address}</div><Copy text={res.normalized_address} /></div>
                </div>
                <div className="ap-facts">
                  {c?.area && <span>{t('ap.a.district')} <b>{lang === 'ar' && c.area_ar ? c.area_ar : c.area}</b></span>}
                  {c?.postal_code && <span>{t('ap.a.postcode')} <b className="num">{c.postal_code}</b></span>}
                  {res.geocoding && <span>{t('ap.a.point')} <b className="num">{res.geocoding.latitude.toFixed(5)}, {res.geocoding.longitude.toFixed(5)}</b></span>}
                </div>
              </div>
              {res.geocoding && <ResultMap lat={res.geocoding.latitude} lng={res.geocoding.longitude} match={match} />}
              {!!c?.landmarks?.length && (
                <div className="ap-notes">{t('ap.a.driver')}
                  <ul>{c.landmarks.map((n, i) => <li key={i} dir="auto">{n}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="ap-card ap-table">
          <h2>{t('ap.a.recent')}</h2>
          <table>
            <thead><tr><th>{t('ap.a.wrote')}</th><th>{t('ap.a.found')}</th><th className="opt">{t('ap.a.match')}</th></tr></thead>
            <tbody>
              {recent.map(({ id, s }) => (
                <tr key={id}>
                  <td className="raw" dir="auto">{s.t}</td>
                  <td>{s.en}</td>
                  <td className="opt"><span className={`ap-pill ${matchTone(s.m)}`}><i />{t(`ap.ms.${s.m}` as const)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

