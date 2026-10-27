import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../translations';
import { useAuth } from '../../hooks/useAuth';
import { WaynLogo } from '../ui/WaynLogo';
import { RUN } from './heroRun';
import './heroConsole.css';

type Precision = 'district' | 'street' | 'place';
interface Sample {
  raw: string; rtl: boolean; precision: Precision; conf: number; lat: number; lng: number;
  en: Record<string, string>; ar: Record<string, string>; notes: string[];
  /** what the "cleaned so far" list shows */
  short: { en: string; ar: string };
}

// What the Wayn engine (POST /api/engine/normalize) returned for these exact inputs on 27 Oct 2026.
const SAMPLES: Sample[] = [
  { raw: 'ورا مسجد الراجحي، حي النسيم الغربي، فيلا رقم ١٤ البوابة السودا، الرياض', rtl: true, precision: 'district', conf: 0.78, lat: 24.7279145, lng: 46.8233278,
    en: { Building: '14', District: 'Al Naseem District West', City: 'Riyadh', 'Postal code': '14231' },
    ar: { 'المبنى': '14', 'الحي': 'النسيم الغربي', 'المدينة': 'الرياض', 'الرمز البريدي': '14231' },
    notes: ['ورا مسجد الراجحي', 'فيلا رقم 14 البوابة السودا'], short: { en: 'Al Naseem District West', ar: 'النسيم الغربي' } },
  { raw: 'olaya st near kingdom tower, bldg 7720 office 3rd flr, riyadh', rtl: false, precision: 'street', conf: 0.88, lat: 24.7066354, lng: 46.6786532,
    en: { Building: '7720', Street: 'Al Olaya Street', District: 'Al Olaya', 'Postal code': '12244' },
    ar: { 'المبنى': '7720', 'الشارع': 'شارع العليا', 'الحي': 'العليا', 'الرمز البريدي': '12244' },
    notes: ['near kingdom tower', 'office 3rd flr'], short: { en: 'Al Olaya Street', ar: 'شارع العليا' } },
  { raw: 'Al Nakheel mall, gate 3, the pharmacy opposite, riyadh', rtl: false, precision: 'place', conf: 0.9, lat: 24.7667684, lng: 46.7157705,
    en: { Place: 'Al Nakheel Mall', District: 'Al Mughrizat', City: 'Riyadh', 'Postal code': '12485' },
    ar: { 'المكان': 'النخيل مول', 'الحي': 'المغرزات', 'المدينة': 'الرياض', 'الرمز البريدي': '12485' },
    notes: ['gate 3', 'the pharmacy opposite'], short: { en: 'Al Nakheel Mall', ar: 'النخيل مول' } },
];
const KG: Record<number, number> = { 1: 12, 2: 4, 3: 9, 4: 6, 5: 15, 6: 3, 7: 8, 8: 5 };
const RIYADH = L.latLngBounds([[24.58, 46.58], [24.84, 46.86]]);
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';

const icon = (html: string, size: number, anchor: [number, number] = [size / 2, size / 2]) =>
  L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: anchor });
const PIN = () => icon('<div class="hc-pin"></div>', 22, [11, 26]);
const DEPOT = () => icon('<div class="hc-depot"></div>', 16);

export const HeroConsole: React.FC = () => {
  const { t, lang, setLang } = useLanguage();
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

    const map = L.map(mapEl.current!, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25 });
    L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }).addTo(map);
    L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19, opacity: 0.7 }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    // keep the action in the strip of map between the copy and the console
    const pad = (): L.FitBoundsOptions => {
      if (innerWidth <= 860) return { paddingTopLeft: [20, 20], paddingBottomRight: [20, 20] };
      const a = $('.hc-copy').getBoundingClientRect(), b = $('.hc-console').getBoundingClientRect();
      const [l, r] = a.left < b.left ? [a, b] : [b, a];
      return { paddingTopLeft: [l.right + 24, 110], paddingBottomRight: [innerWidth - r.left + 24, 70] };
    };
    const frame = (bounds: L.LatLngBounds, duration = 1.4) => map.flyToBounds(bounds, { ...pad(), duration: reduce ? 0 : duration });
    const point = (lat: number, lng: number, zoom: number) => {
      // centre the point in the free strip, not the screen
      const p = pad(), size = map.getSize();
      const tl = L.point(p.paddingTopLeft as L.PointTuple), br = L.point(p.paddingBottomRight as L.PointTuple);
      const off = L.point((tl.x + size.x - br.x) / 2 - size.x / 2, (tl.y + size.y - br.y) / 2 - size.y / 2);
      map.flyTo(map.unproject(map.project([lat, lng], zoom).subtract(off), zoom), zoom, { duration: reduce ? 0 : 1.4 });
    };

    let token = 0, current = 0;
    const tabs = [...el.querySelectorAll<HTMLButtonElement>('.hc-steps button')];
    const setTab = (i: number) => {
      tabs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.classList.toggle('done', k < i); b.style.setProperty('--p', '0%'); });
      el.querySelectorAll('.hc-pane').forEach((p, k) => p.classList.toggle('on', k === i));
    };
    const progress = async (i: number, ms: number, my: number) => {
      const t0 = performance.now();
      while (my === token) {
        const p = Math.min(100, (performance.now() - t0) / ms * 100);
        tabs[i].style.setProperty('--p', p + '%');
        if (p >= 100) return;
        await wait(50);
      }
    };
    const count = async (node: HTMLElement, to: number, ms: number, my: number) => {
      const t0 = performance.now();
      while (my === token) {
        const p = Math.min(1, (performance.now() - t0) / ms);
        node.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1);
        if (p >= 1) return;
        await wait(30);
      }
    };
    const draw = (line: [number, number][], color: string, faded: boolean, ms: number) => {
      const pl = L.polyline(line, { color, weight: faded ? 3 : 4, opacity: faded ? 0.75 : 1, lineCap: 'round', lineJoin: 'round' }).addTo(layer);
      const path = pl.getElement() as SVGPathElement, len = path.getTotalLength();
      path.style.strokeDasharray = String(len); path.style.strokeDashoffset = String(len);
      path.getBoundingClientRect();
      path.style.transition = reduce ? 'none' : `stroke-dashoffset ${ms}ms ease-in-out`; path.style.strokeDashoffset = '0';
      if (faded) setTimeout(() => { path.style.transition = 'none'; path.style.strokeDasharray = '2 8'; }, reduce ? 0 : ms + 50);
      return pl;
    };

    // 1 · clean three real messages
    const clean = async (my: number) => {
      frame(RIYADH);
      const q = [...el.querySelectorAll('.hc-queue i')];
      $('.hc-history').innerHTML = '';
      progress(0, SAMPLES.length * 4600, my);
      for (let k = 0; k < SAMPLES.length && my === token; k++) {
        const s = SAMPLES[k], ar = langRef.current === 'ar';
        q.forEach((e, j) => { e.className = j < k ? 'done' : j === k ? 'on' : ''; });
        const bub = $('.hc-bubble'); bub.dir = s.rtl ? 'rtl' : 'ltr';
        $('.hc-fields').innerHTML = ''; $('.hc-bar i').style.width = '0'; $('.hc-confnum').textContent = ''; $('.hc-precision').textContent = '';
        for (let c = 1; c <= s.raw.length && my === token; c += reduce ? s.raw.length : 2) {
          bub.textContent = s.raw.slice(0, c);
          const caret = document.createElement('span'); caret.className = 'hc-caret'; bub.append(caret);
          await wait(22);
        }
        if (my !== token) return;
        bub.textContent = s.raw;
        const rows = Object.entries(ar ? s.ar : s.en);
        $('.hc-fields').innerHTML = rows.map(([k2, v]) => `<div class="hc-f"><small>${k2}</small><div dir="auto">${v}</div></div>`).join('')
          + `<div class="hc-f wide"><small>${tr('hc.notes')}</small><div class="note" dir="auto">${s.notes.join(' · ')}</div></div>`;
        for (const f of el.querySelectorAll('.hc-f')) { if (my !== token) return; f.classList.add('in'); await wait(110); }
        // a district match is an area, not a door: show it that way
        if (s.precision === 'district') L.marker([s.lat, s.lng], { icon: icon('<div class="hc-area"></div>', 150) }).addTo(layer);
        L.marker([s.lat, s.lng], { icon: PIN() }).addTo(layer);
        point(s.lat, s.lng, s.precision === 'district' ? 14 : 15.5);
        $('.hc-precision').textContent = tr(`hc.prec.${s.precision}`);
        $('.hc-bar i').style.width = s.conf * 100 + '%';
        $('.hc-confnum').textContent = Math.round(s.conf * 100) + '%';
        await wait(2600);
        if (my !== token) return;
        const li = document.createElement('li');
        li.innerHTML = `<span dir="auto">${ar ? s.short.ar : s.short.en}</span><em>${Math.round(s.conf * 100)}%</em>`;
        $('.hc-history').append(li);
      }
      q.forEach(e => { e.className = 'done'; });
    };

    // 2 · plan: the order received first, then Wayn's
    const plan = async (my: number) => {
      const A = RUN.asReceived, B = RUN.planned_route, ar = langRef.current === 'ar', rowH = 38;
      progress(1, 11500, my);
      const ul = $('.hc-stops'); ul.innerHTML = '';
      const rows: Record<number, HTMLLIElement> = {};
      RUN.stops.forEach((s, i) => {
        const li = document.createElement('li'); li.className = 'hc-stop';
        li.innerHTML = `<span class="n">${i + 1}</span><span>${ar ? s.ar : s.name}</span><span class="alt">${ar ? s.name : s.ar}</span><span class="kg" dir="ltr">${KG[s.id]} kg</span>`;
        li.style.transform = `translateY(${i * rowH}px)`; ul.append(li); rows[s.id] = li;
      });
      const kmA = $('.hc-km-a'), kmB = $('.hc-km-b');
      $('.hc-tot-a').className = 'hc-tot hc-tot-a late'; $('.hc-tot-b').className = 'hc-tot hc-tot-b dim';
      kmA.textContent = '0'; kmB.textContent = '—'; $('.hc-hr-a').textContent = ''; $('.hc-hr-b').textContent = ''; $('.hc-saving').textContent = '';
      frame(L.latLngBounds(A.line), 1);
      L.marker([RUN.depot.lat, RUN.depot.lng], { icon: DEPOT() }).addTo(layer);
      const dots: Record<number, L.Marker> = {};
      RUN.stops.forEach((s, i) => { dots[s.id] = L.marker([s.lat, s.lng], { icon: icon(`<div class="hc-dot">${i + 1}</div>`, 24), zIndexOffset: 500 }).addTo(layer); });
      await wait(1100); if (my !== token) return;
      const lineA = draw(A.line, '#E0715F', true, 2600);
      await count(kmA, A.km, 2600, my); if (my !== token) return;
      $('.hc-hr-a').textContent = `${A.hrs.toFixed(1)} ${tr('hc.hrs')}`;
      await wait(900); if (my !== token) return;
      RUN.planned.forEach((id, i) => {
        rows[id].style.transform = `translateY(${i * rowH}px)`; rows[id].classList.add('planned');
        rows[id].querySelector('.n')!.textContent = String(i + 1);
        dots[id].setIcon(icon(`<div class="hc-dot p">${i + 1}</div>`, 24));
      });
      lineA.setStyle({ opacity: 0.5 });
      $('.hc-tot-b').className = 'hc-tot hc-tot-b best';
      draw(B.line, '#F5C842', false, 2600);
      await count(kmB, B.km, 2600, my); if (my !== token) return;
      $('.hc-hr-b').textContent = `${B.hrs.toFixed(1)} ${tr('hc.hrs')} · ${Math.round((1 - B.km / A.km) * 100)}% ${tr('hc.shorter')}`;
      $('.hc-saving').innerHTML = tr('hc.saved').replace('{km}', `<b>${(A.km - B.km).toFixed(1)}</b>`);
      await wait(3600);
    };

    // 3 · the driver's first stop
    const drive = async (my: number) => {
      progress(2, 6500, my);
      const first = SAMPLES[0];
      L.polyline(RUN.planned_route.line, { color: '#F5C842', weight: 3, opacity: 0.35 }).addTo(layer);
      L.marker([RUN.depot.lat, RUN.depot.lng], { icon: DEPOT() }).addTo(layer);
      L.marker([first.lat, first.lng], { icon: PIN() }).addTo(layer);
      point(first.lat, first.lng, 14.5);
      await wait(6500);
    };

    const go = async (i: number) => {
      const my = ++token; current = i; setTab(i); layer.clearLayers();
      if (i === 0) await clean(my); else if (i === 1) await plan(my); else await drive(my);
      if (my === token) go((i + 1) % 3);
    };
    engine.current = { go, step: () => current };
    tabs.forEach(b => { b.onclick = () => go(Number(b.dataset.step)); });

    map.fitBounds(RIYADH, pad());
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { map.invalidateSize(); go(current); }, 200); };
    addEventListener('resize', onResize);
    go(0);
    return () => { token++; removeEventListener('resize', onResize); map.remove(); engine.current = null; };
  }, []);

  // a language switch restarts the current step so its text is redrawn in the new language
  useEffect(() => { const e = engine.current; if (e) e.go(e.step()); }, [lang]);

  const ar = lang === 'ar';
  const num = (n: string) => (ar ? n.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]) : n);

  return (
    <section className="hc" ref={root}>
      <div className="hc-map" ref={mapEl} aria-hidden="true" />
      <div className="hc-shade" />

      <nav className="hc-nav">
        <Link to="/" aria-label="Wayn"><WaynLogo size={22} /></Link>
        <div className="hc-links">
          <a href="#how-it-works">{t('hc.nav1')}</a>
          <a href="#features">{t('hc.nav2')}</a>
        </div>
        <div className="hc-nav-end">
          <button className="hc-lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
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
        <p className="hc-kicker">{t('hc.kicker')}</p>
        <h1>{t('hc.h1')}</h1>
        {/* the line in the other script keeps its own direction but the page's alignment */}
        <p className="hc-echo" dir={ar ? 'ltr' : 'rtl'} style={{ textAlign: ar ? 'right' : 'left' }}>{t('hc.echo')}</p>
        <p className="hc-lead">{t('hc.lead')}</p>
        <div className="hc-cta">
          <Link className="hc-btn" to={isAuthenticated ? '/dashboard/address-normalizer' : '/signup'}>{t('hc.start')}</Link>
          <button className="hc-link" onClick={() => engine.current?.go(1)}>{t('hc.see')}</button>
        </div>
        <p className="hc-fine">{t('hc.fine')}</p>
      </div>
      <p className="hc-proof">{t('hc.proof')}</p>

      <aside className="hc-console" aria-label={t('hc.run')}>
        <div className="hc-head">
          <div className="hc-title"><b>{t('hc.run')}</b><span>{t('hc.orders')}</span></div>
          <div className="hc-steps" role="tablist">
            {(['hc.s0', 'hc.s1', 'hc.s2'] as const).map((k, i) => (
              <button key={k} role="tab" data-step={i}><small>{num(`0${i + 1}`)}</small><span>{t(k)}</span></button>
            ))}
          </div>
        </div>
        <div className="hc-body">
          <div className="hc-pane">
            <p className="hc-label">{t('hc.typed')}</p>
            <div className="hc-bubble" />
            <div className="hc-fields" />
            <div className="hc-conf"><span className="hc-precision" /><div className="hc-bar"><i /></div><b className="hc-confnum" /></div>
            <p className="hc-label">{t('hc.cleaned')}</p>
            <ul className="hc-history" />
            <div className="hc-queue"><i /><i /><i /></div>
          </div>
          <div className="hc-pane">
            <div className="hc-totals">
              <div className="hc-tot hc-tot-a"><small>{t('hc.asReceived')}</small><b dir="ltr"><span className="hc-km-a">0</span><em>km</em></b><span className="hc-hr-a" /></div>
              <div className="hc-tot hc-tot-b dim"><small>{t('hc.planned')}</small><b dir="ltr"><span className="hc-km-b">—</span><em>km</em></b><span className="hc-hr-b" /></div>
            </div>
            <p className="hc-saving" />
            <ul className="hc-stops" />
          </div>
          <div className="hc-pane">
            {/* the driver's screen stays in Arabic: that's who reads it */}
            <div className="hc-phone" dir="rtl">
              <div className="top"><span>المحطة ١ من ٨</span><span>١٠:٤٠ ص</span></div>
              <h4>النسيم الغربي</h4>
              <div className="row"><span>المبنى</span><span>فيلا ١٤</span></div>
              <div className="row"><span>المدينة</span><span>الرياض</span></div>
              <div className="row"><span>الرمز البريدي</span><span>١٤٢٣١</span></div>
              <div className="row"><span>ملاحظة العميل</span><span>ورا مسجد الراجحي، البوابة السودا</span></div>
              <div className="go">ابدأ الملاحة</div>
            </div>
            <p className="hc-drvcap">{t('hc.drvcap')}</p>
          </div>
        </div>
      </aside>
    </section>
  );
};
