import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../translations';
import { useAuth } from '../../hooks/useAuth';
import { WaynLogo } from '../ui/WaynLogo';
import { LangSwitch } from '../app/ui';
import { STORY, type StoryOrder } from './heroStory';
import { FOUND, ONE_VAN, QUERY, type OneVanRun } from './heroOneVan';
import './heroConsole.css';

// The hero plays one real Riyadh day in seven steps: a search that can't choose, Wayn reading the whole message,
// the day landing on the map, then the same van driven as the orders came and as Wayn orders them.
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const GOLD = '#F5C842';
const RED = '#F0705F';
const PHONE = 860;

type Pt = [number, number];
type Mark = { order: StoryOrder; add: () => void };

const ORDER = STORY.orders.find(o => o.id === 'W-1047')!;
const PLACED = STORY.orders.filter(o => o.kind !== 'city');
const VAGUE = STORY.orders.find(o => o.kind === 'city')!;
const BY_ID = Object.fromEntries(STORY.orders.map(o => [o.id, o]));
const DEPOT: Pt = [STORY.depot.lat, STORY.depot.lng];
const BOUNDS = L.latLngBounds([...ONE_VAN.received.line, ...ONE_VAN.planned.line]);
const SAVED = {
  km: ONE_VAN.received.km - ONE_VAN.planned.km,
  min: ONE_VAN.received.min - ONE_VAN.planned.min,
  pct: Math.round((1 - ONE_VAN.planned.km / ONE_VAN.received.km) * 100),
};
const SHARE = ONE_VAN.planned.km / ONE_VAN.received.km;

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
const icon = (html: string, size: number) => L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const isArabic = (s: string) => /[؀-ۿ]/.test(s);

const nearest = (line: Pt[], o: StoryOrder) => {
  let best = 0, bestD = Infinity;
  line.forEach((p, i) => { const d = (p[0] - o.lat) ** 2 + (p[1] - o.lng) ** 2; if (d < bestD) { bestD = d; best = i; } });
  return best;
};

export const HeroConsole: React.FC = () => {
  const { t, lang, isRTL } = useLanguage();
  const { isAuthenticated } = useAuth();
  const root = useRef<HTMLElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [ready, setReady] = useState(false);
  // text the story reads while it runs, so its timers always see the current language
  const tRef = useRef(t); tRef.current = t;

  useEffect(() => {
    const map = L.map(mapEl.current!, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25 });
    map.fitBounds(BOUNDS, { animate: false });
    // the page loader (index.html) lifts once the first view of the map is in
    L.tileLayer(TILES, { maxNativeZoom: 16, maxZoom: 19, updateWhenZooming: false, keepBuffer: 4 }).once('load', () => window.bootDone?.()).addTo(map);
    mapRef.current = map;
    setReady(true);
    return () => { mapRef.current = null; map.remove(); };
  }, []);

  // runs again on a language switch: the old run stops and the story starts over on the mirrored layout
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const el = root.current!, $ = (s: string) => el.querySelector(s) as HTMLElement;
    const tr = (k: TranslationKey) => tRef.current(k);
    const phone = () => window.innerWidth <= PHONE;
    const fit = (): L.FitBoundsOptions => {
      if (phone()) return { padding: [20, 20] };
      const side = Math.round(window.innerWidth * 0.5);
      return { paddingTopLeft: [isRTL ? 50 : side, 160], paddingBottomRight: [isRTL ? side : 50, 60] };
    };
    const reset = () => map.fitBounds(BOUNDS, { ...fit(), animate: false });
    const under = L.layerGroup().addTo(map), lines = L.layerGroup().addTo(map), pins = L.layerGroup().addTo(map), bubbles = L.layerGroup().addTo(map);
    const clear = () => [under, lines, pins, bubbles].forEach(l => l.clearLayers());
    const ro = new ResizeObserver(() => { map.invalidateSize(); });
    ro.observe(mapEl.current!);

    let stopped = false;
    const sleep = (ms: number) => new Promise<void>((res, rej) => setTimeout(() => stopped ? rej(new Error('stopped')) : res(), ms));
    const dot = (o: StoryOrder, c: string) => L.circleMarker([o.lat, o.lng], { radius: 6, color: c, fillColor: c, fillOpacity: 0.95, weight: 2 });
    const depot = () => L.marker(DEPOT, { interactive: false, icon: icon('<div class="hc-depot"></div>', 14) }).addTo(pins);
    const name = (o: StoryOrder) => o.short[lang];

    // a speech bubble on a point of the map; it shifts sideways to stay on screen while its tail stays on the point
    const bubble = (o: StoryOrder, inner: string, cls = '') => {
      const pt = map.latLngToContainerPoint([o.lat, o.lng]), w = map.getSize().x;
      const shift = pt.x > w - 170 ? -210 : pt.x < 240 ? -20 : -110;
      const dir = isArabic(inner) && !cls.includes('done') ? ' dir="rtl"' : '';
      return L.marker([o.lat, o.lng], { interactive: false, zIndexOffset: 900, icon: L.divIcon({ className: '', iconSize: [0, 0],
        html: `<div class="hc-bub ${cls}${pt.y < 230 ? ' down' : ''}" style="--tx:${shift}px;--ox:${-shift}px"${dir}>${inner}</div>` }) }).addTo(bubbles);
    };
    const numbered = (run: OneVanRun, color: string, marks: Record<string, L.Marker>): Mark[] => run.stops.map((id, i) => ({
      order: BY_ID[id],
      add() {
        if (marks[id]) pins.removeLayer(marks[id]);
        marks[id] = L.marker([BY_ID[id].lat, BY_ID[id].lng], { interactive: false, zIndexOffset: 500 + i,
          icon: icon(`<div class="hc-seq" style="background:${color}">${i + 1}</div>`, 22) }).addTo(pins);
      },
    }));

    // the tip of the line moves by time and between points, since the saved lines have few points
    const draw = async (run: OneVanRun, color: string, weight: number, layer: L.LayerGroup, marks: Mark[], ms: number, onTick: (f: number) => void) => {
      const poly = L.polyline([], { color, weight, opacity: 1, lineCap: 'round' }).addTo(layer);
      const line = run.line, todo = marks.map(m => ({ ...m, at: nearest(line, m.order), done: false }));
      const t0 = performance.now();
      for (;;) {
        const f = Math.min((performance.now() - t0) / ms, 1), d = f * (line.length - 1), w = Math.floor(d), q = d - w;
        const a = line[w], b = line[w + 1];
        poly.setLatLngs([...line.slice(0, w + 1), ...(b ? [[a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q] as Pt] : [])]);
        todo.forEach(m => { if (!m.done && d >= m.at) { m.done = true; m.add(); } });
        onTick(f);
        if (f >= 1) return poly;
        await sleep(16);
      }
    };

    const bar = $('.hc-sbar'), query = $('.hc-sbar .q'), results = $('.hc-sbar .res');
    const now = $('.hc-now'), nowN = $('.hc-now small'), nowT = $('.hc-now span');
    const rowA = $('.hc-row.a'), rowB = $('.hc-row.b'), impact = $('.hc-impact');
    const set = (s: string, v: string | number) => { $(s).textContent = String(v); };
    const beat = async (n: number, html: string) => {
      now.classList.add('off');
      await sleep(240);
      nowN.textContent = fill(tr('hs.step'), { n });
      nowT.innerHTML = html;
      now.classList.remove('off');
    };
    const showBars = (km1: number, km2: number, w1: number, w2: number) => {
      set('.hc-row.a b span', km1); set('.hc-row.b b span', km2);
      $('.hc-row.a i').style.width = `${w1 * 100}%`; $('.hc-row.b i').style.width = `${w2 * 100 * SHARE}%`;
    };
    const showImpact = (e: number) => {
      set('.hc-impact .k', Math.round(e * SAVED.km)); set('.hc-impact .m', Math.round(e * SAVED.min)); set('.hc-impact .p', Math.round(e * SAVED.pct));
    };

    // people who ask for less motion get the finished plan and the numbers, with nothing moving
    const still = () => {
      clear(); reset();
      L.polyline(ONE_VAN.received.line, { color: RED, weight: 3, opacity: 0.2 }).addTo(under);
      L.polyline(ONE_VAN.planned.line, { color: GOLD, weight: 5 }).addTo(lines);
      depot();
      numbered(ONE_VAN.planned, GOLD, {}).forEach(m => m.add());
      bar.classList.add('off');
      now.classList.remove('off'); nowN.textContent = ''; nowT.textContent = tr('hs.b7');
      [rowA, rowB].forEach(r => r.classList.remove('wait')); impact.classList.remove('wait');
      showBars(ONE_VAN.received.km, ONE_VAN.planned.km, 1, 1); showImpact(1);
    };

    const film = async () => {
      for (;;) {
        clear(); reset(); showBars(0, 0, 0, 0);
        [rowA, rowB, impact].forEach(r => r.classList.add('wait'));
        bar.classList.remove('off', 'gold'); results.textContent = ''; query.textContent = '';

        // 1. the address goes into a search bar
        await beat(1, esc(tr('hs.b1')));
        for (let i = 1; i <= QUERY.length; i++) { query.innerHTML = `${esc(QUERY.slice(0, i))}<span class="cur"></span>`; await sleep(75); }
        await sleep(500);
        query.textContent = QUERY;

        // 2. the search can't choose
        const count = fill(tr('hs.results'), { n: FOUND.total });
        await beat(2, fill(tr('hs.b2'), { results: `<b class="r">${esc(count)}</b>` }));
        results.textContent = count;
        const red: L.Marker[] = [];
        for (const f of FOUND.pins) {
          red.push(L.marker([f.lat, f.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
            html: `<div class="hc-red"></div><div class="hc-tag">${esc(f[lang])}</div>` }) }).addTo(pins));
          await sleep(320);
        }
        await sleep(1900);

        // 3. Wayn reads the whole message and goes to one place
        await beat(3, esc(tr('hs.b3')));
        red.forEach(m => pins.removeLayer(m));
        bar.classList.add('gold'); results.textContent = ''; query.textContent = ORDER.text;
        await sleep(900);
        map.flyToBounds(L.latLng(ORDER.lat, ORDER.lng).toBounds(2600), { ...fit(), maxZoom: 14, duration: 1.5 });
        await sleep(1550);
        const pin = L.marker([ORDER.lat, ORDER.lng], { interactive: false, icon: icon('<div class="hc-pin"></div>', 16) }).addTo(pins);
        const placed = bubble(ORDER, `<b>${esc(name(ORDER))}</b><span class="tag">${esc(tr('hs.kept'))}</span><span class="said" dir="rtl">${esc(ORDER.notes.join(' · '))}</span>`, 'main done');
        await sleep(3000);
        bubbles.removeLayer(placed);
        bar.classList.add('off');

        // 4. the rest of the day lands on the map
        await beat(4, fill(tr('hs.b4'), { n: '<b class="g hc-cnt">1</b>', all: STORY.orders.length }));
        map.flyToBounds(BOUNDS, { ...fit(), duration: 1.2 });
        await sleep(1250);
        pins.removeLayer(pin);
        dot(ORDER, GOLD).addTo(pins);
        let n = 1;
        for (const o of PLACED.filter(x => x !== ORDER)) {
          const m = bubble(o, esc(o.text));
          dot(o, GOLD).addTo(pins);
          set('.hc-cnt', ++n);
          await sleep(480);
          bubbles.removeLayer(m);
        }
        const flagged = bubble(VAGUE, `${esc(VAGUE.text)}<span class="tag">${esc(tr('hs.vague'))}</span>`);
        await sleep(1900);
        bubbles.removeLayer(flagged);
        pins.clearLayers();
        PLACED.forEach(o => dot(o, GOLD).addTo(pins));
        depot();

        // 5. one van, numbered in the order the orders came
        await beat(5, esc(tr('hs.b5')));
        rowA.classList.remove('wait');
        const marks: Record<string, L.Marker> = {};
        const first = await draw(ONE_VAN.received, RED, 4, under, numbered(ONE_VAN.received, RED, marks), 5200, f => showBars(Math.round(f * ONE_VAN.received.km), 0, f, 0));
        await sleep(1000);

        // 6. the same van with the stops renumbered
        await beat(6, esc(tr('hs.b6')));
        rowB.classList.remove('wait');
        first.setStyle({ opacity: 0.2, weight: 3 });
        await draw(ONE_VAN.planned, GOLD, 5, lines, numbered(ONE_VAN.planned, GOLD, marks), 4400, f => showBars(ONE_VAN.received.km, Math.round(f * ONE_VAN.planned.km), 1, f));
        await sleep(500);

        // 7. what it saves
        await beat(7, esc(tr('hs.b7')));
        impact.classList.remove('wait');
        const t0 = performance.now();
        for (;;) {
          const f = Math.min((performance.now() - t0) / 1200, 1);
          showImpact(1 - (1 - f) ** 3);
          if (f >= 1) break;
          await sleep(16);
        }
        await sleep(7000);
      }
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) still();
    else film().catch(() => { /* stopped: this run was replaced or the page left */ });

    return () => {
      stopped = true;
      ro.disconnect();
      [under, lines, pins, bubbles].forEach(l => l.remove());
    };
  }, [ready, lang, isRTL]);

  return (
    <section className="hc" ref={root}>
      <div className="hc-map" ref={mapEl} aria-hidden="true" />
      <div className="hc-shade" />

      <div className="hc-sbar off" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
        <span className="res" />
        <span className="q" dir="rtl" />
      </div>

      <nav className="hc-nav">
        <Link to="/" aria-label="Wayn"><WaynLogo size={22} /></Link>
        <div className="hc-links">
          <a href="#how-it-works">{t('hc.nav1')}</a>
          <a href="#features">{t('hc.nav2')}</a>
          <a href="#try">{t('wt.label')}</a>
        </div>
        <div className="hc-nav-end">
          <LangSwitch />
          {isAuthenticated ? (
            <Link className="hc-btn hc-btn-sm" to="/dashboard">{t('hc.openDash')}</Link>
          ) : (
            <>
              <Link to="/login">{t('hc.signin')}</Link>
              <Link className="hc-btn hc-btn-sm" to="/signup">{t('hc.start')}</Link>
            </>
          )}
        </div>
      </nav>

      <div className="hc-copy">
        <h1>{t('hc.h1a')} <em>{t('hc.h1b')}</em></h1>
        <p className="hc-lead">{t('hs.lead')}</p>
        <div className="hc-cta">
          <Link className="hc-btn" to={isAuthenticated ? '/dashboard' : '/signup'}>{t('hc.start')}</Link>
          <a className="hc-link" href="#try">{t('hs.try')}</a>
        </div>
        <div className="hc-now off"><small /><span /></div>
        <div className="hc-race num">
          <div className="hc-row a wait"><span>{t('hs.hand')}</span><b><span>0</span> {t('hs.km')}</b><div className="bar"><i /></div></div>
          <div className="hc-row b wait"><span>{t('hs.plan')}</span><b><span>0</span> {t('hs.km')}</b><div className="bar"><i /></div></div>
        </div>
        <div className="hc-impact num wait">
          <div><b><bdi dir="ltr">−<span className="k">0</span></bdi> {t('hs.km')}</b><small>{t('hs.lessKm')}</small></div>
          <div><b><bdi dir="ltr">−<span className="m">0</span></bdi> {t('hs.min')}</b><small>{t('hs.lessMin')}</small></div>
          <div><b><bdi dir="ltr">−<span className="p">0</span>%</bdi></b><small>{t('hs.lessPct')}</small></div>
        </div>
      </div>

      <div className="hc-src">{t('hs.foot')}</div>
    </section>
  );
};
