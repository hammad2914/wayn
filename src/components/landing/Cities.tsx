import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../translations';
import './cities.css';

// The cities whose districts the engine keeps (backend src/data/districts.json, from
// OpenStreetMap), one dot per distinct district. public/data/cities.json is made from that
// file; it is fetched only when the section comes near the screen.
type Point = [number, number, string, string]; // lat, lng, English name, Arabic name
interface City { id: string; en: string; ar: string; country: string; n: number; pts: Point[] }
interface Data { built: string; cities: City[] }

const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';
const GULF = L.latLngBounds([[20.9, 38.9], [29.9, 58.9]]);
const COUNTRIES = ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'] as const;

// the middle 90% of a city's districts: the saved box also holds outlying villages
const core = (pts: Point[]) => {
  const q = (xs: number[], f: number) => xs.slice().sort((a, b) => a - b)[Math.floor(f * (xs.length - 1))];
  const la = pts.map(p => p[0]), ln = pts.map(p => p[1]);
  return L.latLngBounds([q(la, 0.05), q(ln, 0.05)], [q(la, 0.95), q(ln, 0.95)]);
};
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const Cities: React.FC = () => {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const [data, setData] = useState<Data | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const engine = useRef<{ choose: (id: string | null) => void } | null>(null);
  // tooltips read the language when they open, so it is kept in a ref the map can see
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const fmt = (n: number) => n.toLocaleString(ar ? 'ar-SA' : 'en-US');

  // load the districts once the section is close
  useEffect(() => {
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      io.disconnect();
      fetch('/data/cities.json').then(r => r.json()).then(setData).catch(() => {});
    }, { rootMargin: '600px' });
    io.observe(root.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!data) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(mapEl.current!, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, zoomSnap: 0.25, preferCanvas: true });
    const opts = { maxNativeZoom: 16, maxZoom: 19, updateWhenZooming: false, keepBuffer: 4 };
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, opts).addTo(map);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { ...opts, opacity: 0.55 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.fitBounds(GULF, { padding: [20, 20] });
    let current: string | null = null;

    const layers: Record<string, L.CircleMarker[]> = {};
    for (const c of data.cities) {
      layers[c.id] = c.pts.map(([lat, lng, en, arName]) => {
        const m = L.circleMarker([lat, lng], { radius: 2, stroke: false, fillColor: '#F5C842', fillOpacity: 0.85 });
        m.bindTooltip(() => {
          const [a, b] = langRef.current === 'ar' ? [arName || en, en] : [en || arName, arName];
          return `<div dir="auto">${esc(a)}${b && b !== a ? `<span dir="auto">${esc(b)}</span>` : ''}</div>`;
        }, { className: 'wc-tip', direction: 'top', offset: [0, -6] });
        return m.addTo(map);
      });
    }
    // dots grow as the map zooms in, so a city reads as a shape from afar and as districts up close
    map.on('zoomend', () => {
      const r = Math.max(2, Math.min(7, (map.getZoom() - 6) * 1.1));
      Object.values(layers).forEach(ms => ms.forEach(m => m.setRadius(r)));
    });

    // fetch each city's tiles into the browser cache before it is picked, so the map lands sharp
    const warmed = new Set<string>();
    const warm = (bounds: L.LatLngBounds) => {
      const size = map.getSize(), zoom = Math.min(map.getBoundsZoom(bounds, false, L.point(80, 80)), 12);
      const z = Math.round(zoom), c = map.project(bounds.getCenter(), z);
      const half = size.divideBy(2).multiplyBy(map.getZoomScale(z, zoom)).add([256, 256]);
      const a = c.subtract(half).divideBy(256).floor(), b = c.add(half).divideBy(256).floor();
      for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++)
        for (const kind of ['Base', 'Reference']) {
          const url = `${TILES}${kind}/MapServer/tile/${z}/${y}/${x}`;
          if (!warmed.has(url)) { warmed.add(url); new Image().src = url; }
        }
    };
    const timers = data.cities.map((c, i) => window.setTimeout(() => warm(core(c.pts)), 800 + i * 250));

    // the card's height settles after the list is drawn: keep the map filling it
    const ro = new ResizeObserver(() => { map.invalidateSize(); if (!current) map.fitBounds(GULF, { padding: [20, 20] }); });
    ro.observe(mapEl.current!);

    engine.current = {
      choose: id => {
        current = id;
        for (const [k, ms] of Object.entries(layers)) ms.forEach(m => m.setStyle({ fillOpacity: !id || k === id ? 0.85 : 0.25 }));
        const c = data.cities.find(x => x.id === id);
        const duration = reduce ? 0 : 1.4;
        if (c) map.flyToBounds(core(c.pts), { padding: [40, 40], duration, maxZoom: 12 });
        else map.flyToBounds(GULF, { padding: [20, 20], duration });
      },
    };
    return () => { timers.forEach(clearTimeout); ro.disconnect(); map.remove(); engine.current = null; };
  }, [data]);

  const pick = (id: string | null) => { setChosen(id); engine.current?.choose(id); };
  const city = data?.cities.find(c => c.id === chosen);
  const total = data ? data.cities.reduce((s, c) => s + c.n, 0) : null;

  return (
    <section id="cities" className="wc" ref={root}>
      <div className="wc-wrap">
        <div className="wc-head">
          <div>
            <p className="wc-label">{t('wc.label')}</p>
            <h2>{t('wc.h2')}</h2>
          </div>
          <p className="wc-intro">{t('wc.intro')}</p>
        </div>
        <div className="wc-body">
          <div>
            <ul className="wc-list">
              {data && COUNTRIES.map(k => (
                <React.Fragment key={k}>
                  <li className="wc-country">{t(`wc.${k}` as TranslationKey)}</li>
                  {data.cities.filter(c => c.country === k).map(c => (
                    <li key={c.id}>
                      <button type="button" className="wc-city" aria-pressed={c.id === chosen} onClick={() => pick(chosen === c.id ? null : c.id)}>
                        {ar ? c.ar : c.en}<small>{ar ? c.en : c.ar}</small><b>{fmt(c.n)}</b>
                      </button>
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ul>
            {chosen && <p className="wc-all"><button type="button" onClick={() => pick(null)}>{t('wc.all')}</button></p>}
          </div>
          <div className="wc-card">
            <div className="wc-map" ref={mapEl} />
            {total !== null && (
              <p className="wc-total">
                <b>{fmt(city ? city.n : total)}</b>
                <span>{city ? `${t('wc.districts')} · ${ar ? city.ar : city.en}` : t('wc.inAll')}</span>
              </p>
            )}
            {data && <p className="wc-src">{t('wc.src').replace('{d}', data.built)}</p>}
          </div>
        </div>
        <p className="wc-note"><b>{t('wc.noteT')}</b> {t('wc.note')}</p>
      </div>
    </section>
  );
};
