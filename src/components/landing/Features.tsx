import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEPOT, VANS } from './howRun';
import { NASEEM_WEST, OLAYA } from './featuresGeo';
import './features.css';

// Everything here is real engine output. The run is optimize-route on 28 Oct 2026 for eight
// Riyadh districts, two vans with 35 kg limits (the same run as How it works, roads from OSRM).
// The precision examples are POST /engine/try on the same day.
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';
const COLORS = ['#F5C842', '#8FB4FF'];
const CAPACITY = 35;
const MINUTES = [94, 95];
const STOP_AR: Record<string, string> = {
  'Al Yasmin': 'الياسمين', 'Al Mughrizat': 'المغرزات', 'Al Rawdah': 'الروضة', 'Al Naseem West': 'النسيم الغربي',
  'Al Sulimaniyah': 'السليمانية', 'Al Olaya': 'العليا', 'Al Nakheel': 'النخيل', 'Al Malqa': 'الملقا',
};
const SURE = [
  { en: 'Al Nakheel Mall', ar: 'النخيل مول', prec: 'wf.precPlace', conf: 90, lat: 24.7667684, lng: 46.7157705 },
  { en: 'Al Olaya Street, 7720', ar: 'شارع العليا، 7720', prec: 'wf.precStreet', conf: 88, lat: 24.6943932, lng: 46.6846778 },
  { en: 'Al Naseem District West', ar: 'النسيم الغربي', prec: 'wf.precDistrict', conf: 75, lat: 24.72569, lng: 46.82398 },
] as const;

const darkMap = (el: HTMLElement, still = false) => {
  const m = L.map(el, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, zoomSnap: 0.25,
    ...(still ? { dragging: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false } : {}) });
  const opts = { maxNativeZoom: 16, maxZoom: 19, updateWhenZooming: false, keepBuffer: 4 };
  L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, opts).addTo(m);
  L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { ...opts, opacity: 0.6 }).addTo(m);
  return m;
};
const pinIcon = () => L.divIcon({ className: '', html: '<div class="wf-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 20] });

// true once the element has come near the screen (for loading), or onto it (for playing)
const useSeen = (ref: React.RefObject<HTMLElement | null>, opts: IntersectionObserverInit) => {
  const [seen, setSeen] = useState(false);
  const { rootMargin, threshold } = opts;
  useEffect(() => {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin, threshold });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [ref, rootMargin, threshold]);
  return seen;
};

/* ---------- 1 · the run: who takes what, in what order ---------- */
const Run: React.FC = () => {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const card = useRef<HTMLDivElement>(null), mapEl = useRef<HTMLDivElement>(null);
  const near = useSeen(card, { rootMargin: '600px' });
  const play = useSeen(card, { threshold: 0.3 });
  const map = useRef<L.Map | null>(null);
  const marks = useRef<{ vi: number; si: number; el: HTMLElement }[]>([]);
  const [hot, setHot] = useState<string | null>(null);

  const hm = (min: number) => {
    const h = Math.floor(min / 60), m = min % 60;
    return ar ? (h ? `${h} س ${m} د` : `${m} د`) : (h ? `${h} h ${m} min` : `${m} min`);
  };

  useEffect(() => {
    if (!near) return;
    const m = darkMap(mapEl.current!);
    map.current = m;
    const bounds = L.latLngBounds(VANS.flatMap(v => v.line.map(([a, b]) => [a, b] as [number, number])));
    m.fitBounds(bounds, { padding: [28, 28] });
    const ro = new ResizeObserver(() => { m.invalidateSize(); m.fitBounds(bounds, { padding: [28, 28] }); });
    ro.observe(mapEl.current!);
    L.marker([DEPOT.lat, DEPOT.lng], { icon: L.divIcon({ className: '', html: '<div class="wf-depot"></div>', iconSize: [16, 16] }), title: 'Depot' }).addTo(m);
    return () => { ro.disconnect(); m.remove(); map.current = null; marks.current = []; };
  }, [near]);

  // the roads draw, then each stop is numbered in the order the van will drive it
  useEffect(() => {
    const m = map.current;
    if (!play || !m) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = L.layerGroup().addTo(m), timers: number[] = [];
    marks.current = [];
    VANS.forEach((v, vi) => {
      const road = L.polyline(v.line as [number, number][], { color: COLORS[vi], weight: 4, opacity: 0.95, lineJoin: 'round', interactive: false }).addTo(layer);
      const path = road.getElement() as SVGPathElement | undefined;
      if (path && !reduce) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 2400, delay: vi * 700, easing: 'ease-in-out', fill: 'both' });
      }
      v.stops.forEach((st, si) => {
        const mk = L.marker([st.lat, st.lng], { icon: L.divIcon({ className: '', html: `<span class="wf-stop v${vi + 1}">${si + 1}</span>`, iconSize: [24, 24] }), interactive: false }).addTo(layer);
        const el = mk.getElement()!.firstElementChild as HTMLElement;
        marks.current.push({ vi, si, el });
        timers.push(window.setTimeout(() => el.classList.add('on'), reduce ? 0 : 700 + vi * 700 + si * 480));
      });
    });
    return () => { timers.forEach(clearTimeout); layer.remove(); };
  }, [play, near]);

  useEffect(() => {
    marks.current.forEach(mk => mk.el.classList.toggle('dim', hot !== null && hot !== `${mk.vi}-${mk.si}`));
  }, [hot]);

  return (
    <div className={`wf-card wf-run${play ? ' play' : ''}`} ref={card}>
      <div className="wf-run-map" ref={mapEl} />
      <div className="wf-run-vans">
        {VANS.map((v, vi) => (
          <div className="wf-van" key={vi}>
            <div className="wf-van-h">
              <b><i style={{ background: COLORS[vi] }} />{t('wf.van')} {vi + 1}</b>
              <span><span dir="ltr">{v.load}/{CAPACITY} kg</span> · <span dir="ltr">{v.km.toFixed(1)} km</span> · <span>{hm(MINUTES[vi])}</span></span>
            </div>
            <div className="wf-hold" aria-label={`${v.load} / ${CAPACITY} kg`}>
              {v.stops.map((st, si) => (
                <div key={st.en} className={`wf-box v${vi + 1}${hot && hot !== `${vi}-${si}` ? ' dim' : ''}`}
                  style={{ width: `${(st.kg / CAPACITY) * 100}%`, transition: `transform .5s cubic-bezier(.2,.8,.2,1) ${900 + vi * 700 + si * 480}ms, filter .2s` }}
                  onMouseEnter={() => setHot(`${vi}-${si}`)} onMouseLeave={() => setHot(null)}>
                  <b>{si + 1}</b><span dir="ltr">{st.kg} kg</span>
                </div>
              ))}
              <div className="wf-free" title={`${CAPACITY - v.load} kg ${t('wf.free')}`} />
            </div>
            <ol>
              {v.stops.map((st, si) => (
                <li key={st.en} className={hot === `${vi}-${si}` ? 'hot' : ''} onMouseEnter={() => setHot(`${vi}-${si}`)} onMouseLeave={() => setHot(null)}>
                  <span className={`n v${vi + 1}`}>{si + 1}</span><span>{ar ? STOP_AR[st.en] : st.en}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="wf-legend"><i className="wf-depot" />{t('wf.depot')}</p>
      </div>
    </div>
  );
};

/* ---------- 2 · each part of the message goes somewhere ---------- */
const Trace: React.FC = () => {
  const { t, lang } = useLanguage();
  const ar = lang === 'ar';
  const box = useRef<HTMLDivElement>(null);
  const play = useSeen(box, { threshold: 0.4 });

  useEffect(() => {
    if (!play) return;
    const root = box.current!, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let live = true;
    const wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    const target = (k: HTMLElement) => root.querySelector<HTMLElement>(`[data-slot="${k.dataset.to}"]`)!;
    (async () => {
      await wait(300);
      for (const k of root.querySelectorAll<HTMLElement>('.k')) {
        if (!live) return;
        k.classList.add('on');
        const to = target(k);
        if (!reduce) {
          const r = root.getBoundingClientRect(), a = k.getBoundingClientRect(), b = to.getBoundingClientRect();
          const chip = document.createElement('span');
          chip.className = 'wf-chip' + (k.classList.contains('n') ? ' n' : '');
          chip.textContent = k.textContent; chip.dir = 'rtl';
          chip.style.left = `${a.left - r.left}px`; chip.style.top = `${a.top - r.top}px`;
          root.append(chip);
          const c = chip.getBoundingClientRect();
          const dx = (ar || k.classList.contains('n') ? b.right - c.width : b.left) - c.left, dy = b.top + b.height / 2 - (c.top + c.height / 2);
          await chip.animate([
            { transform: 'translate(0,0)' },
            { transform: `translate(${dx / 2}px,${dy / 2 - 30}px) scale(1.05)`, offset: 0.5 },
            { transform: `translate(${dx}px,${dy}px) scale(.9)`, opacity: 1 },
            { transform: `translate(${dx}px,${dy}px) scale(.9)`, opacity: 0 },
          ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
          chip.remove();
        }
        to.classList.add('on');
        const cell = to.closest<HTMLElement>('.wf-f,.wf-note')!;
        cell.classList.remove('hit'); void cell.offsetWidth; cell.classList.add('hit');
        await wait(150);
      }
      await wait(300);
      root.querySelectorAll('[data-slot="postal"],.wf-f .tag').forEach(n => n.classList.add('on'));
    })();
    return () => { live = false; root.querySelectorAll('.wf-chip').forEach(c => c.remove()); };
  }, [play, ar]);

  return (
    <div className="wf-card wf-trace" ref={box}>
      <p className="wf-bubble" dir="rtl">
        <span className="k n" data-to="note1">ورا مسجد الراجحي</span>، <span className="k" data-to="district">حي النسيم الغربي</span>،{' '}
        <span className="k" data-to="building">فيلا رقم ١٤</span> <span className="k n" data-to="note2">البوابة السودا</span>،{' '}
        <span className="k" data-to="city">الرياض</span>
      </p>
      <div className="wf-label-card">
        <header><b>WAYN</b><span dir="ltr">RUH · 14231</span></header>
        <div className="wf-fields">
          <div className="wf-f"><small>{t('wf.toBuilding')}</small><b data-slot="building">14</b></div>
          <div className="wf-f"><small>{t('wf.toDistrict')}</small><b data-slot="district">{ar ? 'النسيم الغربي' : 'Al Naseem District West'}</b></div>
          <div className="wf-f"><small>{t('wf.toCity')}</small><b data-slot="city">{ar ? 'الرياض' : 'Riyadh'}</b></div>
          <div className="wf-f"><small>{t('wf.toPostal')}</small><b data-slot="postal">14231</b><span className="tag">{t('wf.added')}</span></div>
        </div>
        <div className="wf-note"><small>{t('wf.toNote')}</small>
          <b dir="rtl"><span data-slot="note1">ورا مسجد الراجحي</span><span data-slot="note2"> · البوابة السودا</span></b>
        </div>
      </div>
      <div className="wf-key"><span><i />{t('wf.keyField')}</span><span><i className="n" />{t('wf.keyNote')}</span></div>
    </div>
  );
};

/* ---------- 3 · how sure, shown on the map ---------- */
const Sure: React.FC = () => {
  const { t, lang } = useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const near = useSeen(box, { rootMargin: '600px' });
  const play = useSeen(box, { threshold: 0.3 });
  const els = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!near) return;
    const cleanups = SURE.map((s, i) => {
      const el = els.current[i]!, m = darkMap(el, true);
      const fit = () => {
        m.invalidateSize();
        if (i === 2) m.fitBounds(L.latLngBounds(NASEEM_WEST), { padding: [18, 18] });
        else m.setView([s.lat, s.lng], i === 0 ? 16 : 15);
      };
      if (i === 0) {
        L.circle([s.lat, s.lng], { radius: 40, color: '#F5C842', weight: 1, fillOpacity: 0.15, interactive: false }).addTo(m);
        L.marker([s.lat, s.lng], { icon: pinIcon(), interactive: false }).addTo(m);
      } else if (i === 1) {
        OLAYA.forEach(l => L.polyline(l, { color: '#F5C842', weight: 9, opacity: 0.18, interactive: false }).addTo(m));
        OLAYA.forEach(l => L.polyline(l, { color: '#F5C842', weight: 3, opacity: 0.9, interactive: false }).addTo(m));
        L.marker([s.lat, s.lng], { icon: pinIcon(), interactive: false }).addTo(m);
      } else {
        L.polygon(NASEEM_WEST, { color: '#F0A54A', weight: 1.5, dashArray: '5 5', fillColor: '#F0A54A', fillOpacity: 0.18, interactive: false }).addTo(m);
        L.circleMarker([s.lat, s.lng], { radius: 5, color: '#0A0E27', weight: 2, fillColor: '#F0A54A', fillOpacity: 1, interactive: false }).addTo(m);
      }
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(el);
      return () => { ro.disconnect(); m.remove(); };
    });
    return () => cleanups.forEach(c => c());
  }, [near]);

  return (
    <div className={`wf-sure${play ? ' play' : ''}`} ref={box}>
      {SURE.map((s, i) => (
        <div key={s.en} className={`wf-card${i === 2 ? ' check' : ''}`}>
          <div className="wf-mini" ref={el => { els.current[i] = el; }} />
          <div className="b">
            <div className="top"><b>{lang === 'ar' ? s.ar : s.en}</b><em>{s.conf}%</em></div>
            <div className="sub"><span>{t(s.prec)}</span>{i === 2 && <span className="wf-flag">{t('wf.checkFirst')}</span>}</div>
            <div className="bar"><i style={{ width: `${s.conf}%` }} /></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Features: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section id="features" className="wf">
      <div className="wf-wrap">
        <header className="wf-head">
          <p className="wf-label">{t('wf.label')}</p>
          <h2>{t('wf.h2')}</h2>
        </header>

        {/* the main thing: one run, shared between vans, each in its shortest order */}
        <div className="wf-lead">
          <div className="wf-text">
            <p className="wf-num">01</p>
            <h3>{t('wf.f3T')}</h3>
            <p>{t('wf.f3')}</p>
          </div>
          <Run />
          <p className="wf-cap">{t('wf.vansCap')}</p>
        </div>

        <div className="wf-row">
          <div className="wf-text">
            <p className="wf-num">02</p>
            <h3>{t('wf.f1T')}</h3>
            <p>{t('wf.f1')}</p>
          </div>
          <Trace />
        </div>

        <div className="wf-row">
          <div className="wf-text">
            <p className="wf-num">03</p>
            <h3>{t('wf.f2T')}</h3>
            <p>{t('wf.f2')}</p>
          </div>
          <Sure />
        </div>
      </div>
    </section>
  );
};
