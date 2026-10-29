import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../translations';
import { useAuth } from '../../hooks/useAuth';
import { WaynLogo } from '../ui/WaynLogo';
import { LangSwitch } from '../app/ui';
import { STORY, type Kind, type StoryVan } from './heroStory';
import './heroConsole.css';

const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';
const VAN = ['#F5C842', '#7FB2FF'];
const TONE: Record<Kind, string> = { street: 'ok', place: 'ok', landmark: 'ok', district: 'check', city: 'warn' };
// how long each step plays before the next one starts
const LEN = [7500, 7500, 8000, 9000];
const VAN_ICON = '<div class="hc-van"><svg viewBox="0 0 24 24"><path d="M2 7.5A1.5 1.5 0 0 1 3.5 6H14v10H2zM14 9.5h3.6l3.4 3.6V16h-7z" fill="#0A0E27"/><circle cx="6.5" cy="17" r="2" fill="#0A0E27" stroke="#fff" stroke-width="1.2"/><circle cx="17" cy="17" r="2" fill="#0A0E27" stroke="#fff" stroke-width="1.2"/></svg></div>';

const byId = Object.fromEntries(STORY.orders.map(o => [o.id, o]));
const placed = STORY.orders.filter(o => o.kind !== 'city');
const searchHits = STORY.orders.filter(o => o.searchFound.length).length;
const saved = { km: STORY.byHand.km - STORY.wayn.km, min: STORY.byHand.min - STORY.wayn.min, pct: Math.round((1 - STORY.wayn.km / STORY.byHand.km) * 100) };

const icon = (html: string, size: number) => L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

// line helpers: the point nearest a stop, running length, a point part-way along
type Pt = [number, number];
const near = (line: Pt[], s: { lat: number; lng: number }) =>
  line.reduce((bi, p, i) => (p[0] - s.lat) ** 2 + (p[1] - s.lng) ** 2 < (line[bi][0] - s.lat) ** 2 + (line[bi][1] - s.lng) ** 2 ? i : bi, 0);
const cum = (line: Pt[]) => line.reduce<number[]>((c, p, i) => (c.push(i ? c[i - 1] + Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) : 0), c), []);
const along = (line: Pt[], c: number[], f: number): Pt => {
  const d = f * c[c.length - 1]; let i = 1;
  while (i < c.length - 1 && c[i] < d) i++;
  const s = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * s, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * s];
};
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

export const HeroConsole: React.FC = () => {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const root = useRef<HTMLElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const engine = useRef<{ go: (i: number) => void; step: () => number } | null>(null);
  // the engine reads text through refs so a language switch doesn't rebuild the map
  const tRef = useRef(t); tRef.current = t;
  const langRef = useRef(lang); langRef.current = lang;

  useEffect(() => {
    const el = root.current!, $ = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    const tr = (k: string) => tRef.current(k as TranslationKey);
    const body = $('.hc-body'), foot = $('.hc-sum');

    const map = L.map(mapEl.current!, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25 });
    // tiles load once a flight lands, not at every zoom it passes through, and are fetched ahead (warm)
    const tileOpts = { maxNativeZoom: 16, maxZoom: 19, updateWhenZooming: false, keepBuffer: 4 };
    // the page loader (index.html) lifts once the first view of the map is in
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, tileOpts).once('load', () => window.bootDone?.()).addTo(map);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { ...tileOpts, opacity: 0.7 }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    // the open map: beside the copy and above the floating panel; on phones the map is its own block
    const pad = () => {
      if (innerWidth <= 860) return { tl: L.point(20, 20), br: L.point(20, 20) };
      const m = mapEl.current!.getBoundingClientRect(), a = $('.hc-copy').getBoundingClientRect(), b = $('.hc-story').getBoundingClientRect();
      const bottom = m.bottom - b.top + 24;
      return langRef.current === 'ar'
        ? { tl: L.point(40, 96), br: L.point(m.right - a.left + 48, bottom) }
        : { tl: L.point(a.right - m.left + 48, 96), br: L.point(40, bottom) };
    };
    const view = (bounds: L.LatLngBounds, maxZoom: number) => {
      const { tl, br } = pad(), size = map.getSize();
      const zoom = Math.min(map.getBoundsZoom(bounds, false, tl.add(br)), maxZoom);
      const mid = map.project(bounds.getCenter(), zoom).add(br.subtract(tl).divideBy(2));
      return { center: map.unproject(mid, zoom), zoom, size };
    };
    // fetch a view's tiles into the browser cache before flying there, so they appear as the map lands
    const warmed = new Set<string>();
    const warm = ({ center, zoom, size }: ReturnType<typeof view>) => {
      const z = Math.min(Math.round(zoom), 16), scale = map.getZoomScale(z, zoom);
      const c = map.project(center, z), half = size.divideBy(2).multiplyBy(scale).add([256, 256]);
      const a = c.subtract(half).divideBy(256).floor(), b = c.add(half).divideBy(256).floor();
      for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++)
        for (const kind of ['Base', 'Reference']) {
          const url = `${TILES}${kind}/MapServer/tile/${z}/${y}/${x}`;
          if (!warmed.has(url)) { warmed.add(url); new Image().src = url; }
        }
    };
    const frame = (pts: L.LatLngExpression[], maxZoom = 13) => {
      map.invalidateSize();
      const v = view(L.latLngBounds(pts), maxZoom); warm(v);
      map.flyTo(v.center, v.zoom, { duration: reduce ? 0 : 1.4 });
    };
    const allOrders = STORY.orders.map(o => [o.lat, o.lng] as Pt);
    const lastLeg = (() => {
      const v = STORY.vans[0], last = byId[v.stops.at(-1)!], prev = byId[v.stops.at(-2)!];
      const k0 = near(v.line, prev), k1 = near(v.line, last), leg = v.line.slice(Math.min(k0, k1), Math.max(k0, k1) + 1);
      if (k0 > k1) leg.reverse();
      return [...leg, [last.lat, last.lng] as Pt];
    })();
    // every shot the loop will take, warmed one step ahead
    const ahead = () => {
      warm(view(L.latLngBounds(placed.map(o => [o.lat, o.lng] as Pt)), 13));
      warm(view(L.latLngBounds([...STORY.vans.flatMap(v => v.line), ...STORY.byHand.lines.flat()]), 13));
      warm(view(L.latLngBounds(lastLeg), 14));
    };

    let token = 0, current = 0;
    const tween = (ms: number, fn: (p: number) => void, my: number) => new Promise<void>(done => {
      if (reduce) { fn(1); return done(); }
      const t0 = performance.now();
      const step = (now: number) => {
        if (my !== token) return done();
        const p = Math.min(1, (now - t0) / ms); fn(ease(p));
        if (p < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    const stopPin = (id: string, n: number, i: number) =>
      L.marker([byId[id].lat, byId[id].lng], { icon: icon(`<div class="hc-stop" style="background:${VAN[i]}">${n}</div>`, 22), zIndexOffset: 500 }).addTo(layer);
    const tabs = () => [...el.querySelectorAll<HTMLButtonElement>('.hc-steps button')];
    const setTab = (i: number) => tabs().forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i)); b.classList.toggle('done', k < i);
      const bar = b.querySelector('i')!;
      bar.getAnimations().forEach(a => a.cancel());
      if (k === i && !reduce) bar.animate([{ width: '0%' }, { width: '100%' }], { duration: LEN[i], fill: 'forwards' });
    });
    // keep the newest row in view as the list fills
    const follow = (li: HTMLElement) => body.scrollTo({ top: Math.max(0, li.offsetTop + li.offsetHeight - body.clientHeight), behavior: reduce ? 'auto' : 'smooth' });

    // 1 and 2 share one list: each message, then the clean address it became
    const list = () => {
      const ar = langRef.current === 'ar';
      return `<ul class="hc-msgs">${STORY.orders.map(o => `<li data-id="${o.id}">
        <div class="raw" dir="auto">${esc(o.text)}</div><div class="cl" dir="auto">${esc(ar ? o.ar : o.en)}</div>
        <div class="who">${o.id} · ${tr('hs.from')} ${esc(o.name)}</div>
        <div class="tg"><span class="hc-pill s1 none">${tr(o.searchFound.length ? 'hs.search1' : 'hs.search0')}</span><span class="hc-pill s2 ${TONE[o.kind]}">${tr(`hs.k.${o.kind}`)}</span></div></li>`).join('')}</ul>`;
    };

    // 1 · the day's messages, and what a plain map search makes of them
    const orders = async (my: number) => {
      body.innerHTML = list();
      frame(allOrders, 12);
      const lis = [...body.querySelectorAll<HTMLElement>('li')];
      for (const li of lis) { li.classList.add('in'); await wait(140); if (my !== token) return; }
      for (const li of lis) {
        li.querySelector('.s1')!.classList.add('in'); follow(li);
        byId[li.dataset.id!].searchFound.forEach(p =>
          L.circle(p, { radius: 1400, color: '#F0A54A', weight: 1, dashArray: '4 4', fillOpacity: 0.05 }).addTo(layer));
        await wait(220); if (my !== token) return;
      }
      foot.innerHTML = fill(tr('hs.f1'), { none: STORY.orders.length - searchHits, some: searchHits });
    };

    // 2 · each message becomes a clean address with a pin
    const clean = async (my: number) => {
      body.innerHTML = list(); body.classList.add('clean');
      body.querySelectorAll('li').forEach(li => li.classList.add('in'));
      frame(placed.map(o => [o.lat, o.lng] as Pt), 12);
      for (const o of STORY.orders) {
        const pill = body.querySelector<HTMLElement>(`[data-id="${o.id}"] .s2`)!;
        pill.classList.add('in'); follow(pill.closest('li')!);
        if (o.kind !== 'city') L.marker([o.lat, o.lng], { icon: icon(`<div class="hc-pin ${o.kind === 'district' ? 'check' : ''}"></div>`, 14) }).addTo(layer);
        await wait(260); if (my !== token) return;
      }
      foot.innerHTML = fill(tr('hs.f2'), { n: placed.length, f: STORY.orders.length - placed.length });
    };

    // one van's road line drawn as a single stroke; each stop appears, numbered in the van's colour, as the line reaches it
    const drawVan = async (v: StoryVan, i: number, lis: Element[], my: number) => {
      const line = L.polyline(v.line, { color: VAN[i], weight: 4, opacity: 0.95, noClip: true, lineCap: 'round', lineJoin: 'round' }).addTo(layer);
      const path = line.getElement() as SVGPathElement, len = path.getTotalLength(), c = cum(v.line);
      const at = v.stops.map(id => c[near(v.line, byId[id])] / c[c.length - 1]), shown = new Set<number>();
      path.style.strokeDasharray = String(len); path.style.strokeDashoffset = String(len);
      await tween(2400, p => {
        path.style.strokeDashoffset = String(len * (1 - p));
        at.forEach((f, k) => { if (f <= p + 0.001 && !shown.has(k)) { shown.add(k); stopPin(v.stops[k], k + 1, i); lis[k]?.classList.add('in'); } });
      }, my);
      path.style.strokeDasharray = ''; path.style.strokeDashoffset = '';
    };

    // 3 · the same orders by hand (in the order they came in) against Wayn's plan
    const plan = async (my: number) => {
      const ar = langRef.current === 'ar', H = STORY.byHand, W = STORY.wayn;
      const row = (cls: string, label: string, d: { km: number; min: number }) => `<div class="row ${cls}"><span>${tr(label)}</span>
        <span class="num"><b>${d.km}</b> ${tr('hs.km')} · <b>${d.min}</b> ${tr('hs.min')}</span>
        <div class="track"><i data-w="${(d.km / H.km * 100).toFixed(1)}"></i></div></div>`;
      body.innerHTML = `<div class="hc-cmp">${row('hand', 'hs.hand', H)}${row('plan', 'hs.plan', W)}</div>
        <div class="hc-vans">${STORY.vans.map((v, i) => `<div class="hc-vcard"><h4><i style="background:${VAN[i]}"></i>${v.id}</h4>
          <div class="kv num"><span><b>${v.stops.length}</b> ${tr('hs.stops')}</span><span><b>${v.km}</b> ${tr('hs.km')}</span><span><b>${v.min}</b> ${tr('hs.min')}</span><span><b>${v.kg}</b> ${tr('hs.kg')}</span></div>
          <ol>${v.stops.map(id => `<li>${esc(ar ? byId[id].short.ar : byId[id].short.en)}</li>`).join('')}</ol></div>`).join('')}</div>`;
      const bar = (cls: string) => {
        const r = body.querySelector<HTMLElement>('.' + cls)!, i = r.querySelector<HTMLElement>('i')!;
        r.classList.add('in'); requestAnimationFrame(() => { i.style.width = i.dataset.w + '%'; });
      };
      L.marker([STORY.depot.lat, STORY.depot.lng], { icon: icon('<div class="hc-depot"></div>', 16) }).addTo(layer);
      frame([[STORY.depot.lat, STORY.depot.lng], ...STORY.vans.flatMap(v => v.line), ...H.lines.flat()], 12);
      bar('hand');
      H.lines.forEach(l => L.polyline(l, { color: '#E0715F', weight: 3, opacity: 0.9, dashArray: '6 6', className: 'hc-fade' }).addTo(layer));
      await wait(1500); if (my !== token) return;
      bar('plan');
      const cards = [...body.querySelectorAll('.hc-vcard')];
      for (let i = 0; i < STORY.vans.length; i++) {
        cards[i].classList.add('in');
        await drawVan(STORY.vans[i], i, [...cards[i].querySelectorAll('li')], my);
        if (my !== token) return;
      }
      foot.innerHTML = fill(tr('hs.f3'), saved);
    };

    // 4 · what the driver sees at the last stop, and the van driving in
    const drive = async (my: number) => {
      const ar = langRef.current === 'ar', v = STORY.vans[0], o = byId[v.stops.at(-1)!];
      body.innerHTML = `<div class="hc-drv"><div class="top"><span>${fill(tr('hs.stop'), { i: v.stops.length, n: v.stops.length })}</span><span class="num">${o.id} · ${esc(o.name)}</span></div>
        <div><h3 dir="auto">${esc(ar ? o.ar : o.en)}</h3><p class="alt" dir="auto">${esc(ar ? o.en : o.ar)}</p></div>
        <div class="notes">${o.notes.map(n => `<div><small>${tr('hs.said')}</small><span dir="rtl">${esc(n)}</span></div>`).join('')}</div>
        <div class="acts"><span class="go">${tr('hs.go')}</span><span>${tr('hs.done')}</span></div></div>`;
      foot.innerHTML = tr('hs.f4');
      L.polyline(v.line, { color: VAN[0], weight: 4, opacity: 0.9 }).addTo(layer);
      v.stops.forEach((id, k) => stopPin(id, k + 1, 0));
      frame(lastLeg, 14);
      const van = L.marker(lastLeg[0], { icon: icon(VAN_ICON, 30), zIndexOffset: 1000 }).addTo(layer), c = cum(lastLeg);
      await wait(1600); if (my !== token) return;
      await tween(5000, p => van.setLatLng(along(lastLeg, c, p)), my);
    };

    const go = async (i: number) => {
      const my = ++token; current = i; setTab(i); layer.clearLayers();
      body.classList.remove('clean'); body.scrollTop = 0; foot.innerHTML = '';
      const t0 = Date.now();
      await [orders, clean, plan, drive][i](my);
      await wait(Math.max(1500, LEN[i] - (Date.now() - t0)));
      if (my === token) go((i + 1) % 4);
    };
    engine.current = { go, step: () => current };
    tabs().forEach((b, i) => { b.onclick = () => go(i); });

    map.fitBounds(L.latLngBounds(allOrders), { paddingTopLeft: pad().tl, paddingBottomRight: pad().br });
    // the opening view first, then the rest once it has had a moment
    const aheadTimer = window.setTimeout(ahead, 1500);
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { map.invalidateSize(); go(current); }, 200); };
    addEventListener('resize', onResize);
    go(0);
    return () => { token++; clearTimeout(aheadTimer); removeEventListener('resize', onResize); map.remove(); engine.current = null; };
  }, []);

  // a language switch restarts the current step so its text is redrawn in the new language
  useEffect(() => { const e = engine.current; if (e) e.go(e.step()); }, [lang]);

  return (
    <section className="hc" ref={root}>
      <div className="hc-map" ref={mapEl} aria-hidden="true" />
      <div className="hc-shade" />

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
        <h1>{t('hc.h1')}</h1>
        <p className="hc-lead">{t('hs.lead')}</p>
        <div className="hc-cta">
          <Link className="hc-btn" to={isAuthenticated ? '/dashboard' : '/signup'}>{t('hc.start')}</Link>
          <a className="hc-link" href="#try">{t('hs.try')}</a>
        </div>
        <div className="hc-impact num">
          <div><b>{placed.length} {t('hs.of')} {STORY.orders.length}</b><span>{t('hs.placed')}</span></div>
          <div><b><bdi dir="ltr">−{saved.km}</bdi> {t('hs.km')}</b><span>{t('hs.lessKm')}</span></div>
          <div><b><bdi dir="ltr">−{saved.min}</bdi> {t('hs.min')}</b><span>{t('hs.lessMin')}</span></div>
        </div>
      </div>
      <p className="hc-proof">{t('hs.foot')}</p>

      <aside className="hc-story" aria-label={t('hs.story')}>
        <div className="hc-steps" role="tablist">
          {(['hs.st0', 'hs.st1', 'hs.st2', 'hs.st3'] as const).map((k, i) => (
            <button key={k} role="tab"><small>{i + 1}</small>{t(k)}<i /></button>
          ))}
        </div>
        <div className="hc-body" />
        <div className="hc-sum" aria-live="polite" />
      </aside>
    </section>
  );
};
