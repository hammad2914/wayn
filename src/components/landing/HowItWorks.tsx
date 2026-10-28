import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DEPOT, DOTS, VANS } from './howRun';
import './howItWorks.css';

// How it works, as a picture: the eight messages come in, each is pinned to its district,
// then the two vans' roads are drawn. Plays when on screen, then loops. All data is real (howRun.ts).
const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#F5C842', '#8FB4FF'];
// the order the messages arrived in, which is not the planned order
const ARRIVED = ['Al Malqa', 'Al Rawdah', 'Al Olaya', 'Al Yasmin', 'Al Naseem West', 'Al Sulimaniyah', 'Al Nakheel', 'Al Mughrizat'];

const el = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.append(e);
  return e;
};

export const HowItWorks: React.FC = () => {
  const { t, lang } = useLanguage();
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const actsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const svg = svgRef.current!, rtl = lang === 'ar';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    let token = 0, inView = false;

    const build = () => {
      const my = ++token, wide = stage.current!.clientWidth > 560;
      // messages beside the city, or above it on a phone
      const L = wide ? { W: 1180, H: 560, msgs: { x: 32, y: 40, w: 330, h: 480 }, map: { x: 400, y: 20, w: 760, h: 520 } }
                     : { W: 400, H: 760, msgs: { x: 16, y: 16, w: 368, h: 300 }, map: { x: 0, y: 330, w: 400, h: 420 } };
      svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);

      // projection: the stops, depot and roads fill the map area
      const all = [DEPOT, ...VANS.flatMap(v => v.stops), ...VANS.flatMap(v => v.line.map(([lat, lng]) => ({ lat, lng })))];
      const kx = Math.cos(24.72 * Math.PI / 180);
      const xs = all.map(p => p.lng * kx), ys = all.map(p => -p.lat);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const pad = 44, s = Math.min((L.map.w - 2 * pad) / (x1 - x0), (L.map.h - 2 * pad) / (y1 - y0));
      const ox = L.map.x + (L.map.w - (x1 - x0) * s) / 2, oy = L.map.y + (L.map.h - (y1 - y0) * s) / 2;
      // in Arabic the messages sit on the right, so the map moves left (the city is not mirrored)
      const shift = rtl && wide ? -(L.map.x - 20) : 0;
      const P = (lat: number, lng: number) => [ox + (lng * kx - x0) * s + shift, oy + (-lat - y0) * s];

      // the city, drawn from its own districts
      const city = el('g', {}, svg);
      for (const [lat, lng] of DOTS) {
        const [x, y] = P(lat, lng);
        if (x > -10 && x < L.W + 10 && y > L.map.y - 10 && y < L.H + 10) el('circle', { cx: x, cy: y, r: 2.2, fill: '#252E5E' }, city);
      }
      const roads = el('g', {}, svg), links = el('g', {}, svg), pins = el('g', {}, svg), labels = el('g', {}, svg);
      const [dx, dy] = P(DEPOT.lat, DEPOT.lng);
      el('rect', { x: dx - 7, y: dy - 7, width: 14, height: 14, rx: 3, fill: '#0A0E27', stroke: '#ECEFF7', 'stroke-width': 2 }, svg);

      const stops = VANS.flatMap((v, vi) => v.stops.map((st, si) => ({ ...st, vi, si })));
      const bh = Math.min(46, (L.msgs.h - 70) / 8), gap = (L.msgs.h - 8 * bh) / 7;
      const bx = rtl ? L.W - L.msgs.x - L.msgs.w : L.msgs.x;
      const bubbles = ARRIVED.map((name, i) => {
        const st = stops.find(x => x.en === name)!, y = L.msgs.y + i * (bh + gap);
        const fo = el('foreignObject', { x: bx, y, width: L.msgs.w, height: bh }, svg);
        const div = document.createElement('div');
        div.className = 'wh-b';
        div.innerHTML = '<span class="d"></span><span class="t"></span><span class="kg"></span>';
        div.querySelector('.t')!.textContent = st.raw;
        div.querySelector('.kg')!.textContent = `${st.kg} kg`;
        fo.append(div);
        // the link leaves from the bubble's map-facing edge (below it on a phone)
        const ex = wide ? (rtl ? bx : bx + L.msgs.w) : bx + L.msgs.w / 2, ey = wide ? y + bh / 2 : y + bh;
        return { st, fo, div, x: ex, y: ey, pin: null as SVGElement | null };
      });

      const acts = [...actsRef.current!.children];
      const act = (i: number) => acts.forEach((a, k) => { a.classList.toggle('on', k === i); a.classList.toggle('done', i >= 0 && k < i); });
      const fade = (n: Element, to: number, ms = 400) =>
        n.animate([{ opacity: getComputedStyle(n).opacity }, { opacity: to }], { duration: reduce ? 0 : ms, fill: 'forwards' });

      (async () => {
        while (my === token) {
          act(-1); roads.innerHTML = ''; links.innerHTML = ''; pins.innerHTML = ''; labels.innerHTML = '';
          for (const n of [roads, pins, labels]) n.getAnimations().forEach(a => a.cancel());
          bubbles.forEach(b => { b.fo.getAnimations().forEach(a => a.cancel()); b.fo.style.opacity = '0'; b.div.className = 'wh-b'; });
          while (!inView && my === token) await wait(200);
          if (my !== token) return;

          // 1 · messages come in
          act(0);
          for (const b of bubbles) { if (my !== token) return; fade(b.fo, 1, 350); await wait(170); }
          await wait(700);

          // 2 · each one is pinned to its district
          act(1);
          for (const b of bubbles) {
            if (my !== token) return;
            const [px, py] = P(b.st.lat, b.st.lng);
            const path = el('path', { d: `M${b.x},${b.y} Q${(b.x + px) / 2},${Math.min(b.y, py) - 50} ${px},${py}`,
              fill: 'none', stroke: 'rgba(236,239,247,.3)', 'stroke-width': 1.2, 'stroke-dasharray': '3 5' }, links) as SVGPathElement;
            const dot = el('circle', { r: 4, fill: '#ECEFF7' }, links), len = path.getTotalLength(), t0 = performance.now(), dur = reduce ? 0 : 480;
            await new Promise<void>(res => {
              const step = (now: number) => {
                const k = dur ? Math.min(1, (now - t0) / dur) : 1, p = path.getPointAtLength(len * (1 - Math.pow(1 - k, 2)));
                dot.setAttribute('cx', String(p.x)); dot.setAttribute('cy', String(p.y));
                if (k < 1 && my === token) requestAnimationFrame(step); else res();
              };
              requestAnimationFrame(step);
            });
            dot.remove(); fade(path, 0, 700);
            el('circle', { cx: px, cy: py, r: 4, fill: 'none', stroke: '#ECEFF7', 'stroke-width': 1.5 }, pins)
              .animate([{ r: 4, opacity: 0.9 }, { r: 24, opacity: 0 }], { duration: reduce ? 0 : 700, fill: 'forwards' });
            b.pin = el('circle', { cx: px, cy: py, r: 6, fill: '#ECEFF7', stroke: '#0E1330', 'stroke-width': 2 }, pins);
            b.div.classList.add('pinned');
            await wait(90);
          }
          await wait(900);
          links.innerHTML = '';

          // 3 · two vans, two roads, from the depot and back
          act(2);
          for (const [vi, v] of VANS.entries()) {
            if (my !== token) return;
            const pts = v.line.map(([lat, lng]) => P(lat, lng));
            const road = el('path', { d: 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(',')).join('L'), fill: 'none', stroke: COLORS[vi],
              'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, roads) as SVGPathElement;
            const len = road.getTotalLength();
            road.style.strokeDasharray = String(len);
            road.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: reduce ? 0 : 2200, easing: 'ease-in-out', fill: 'forwards' });
            for (const b of bubbles.filter(b => b.st.vi === vi)) {
              b.pin!.setAttribute('fill', COLORS[vi]);
              b.div.classList.add('v' + (vi + 1));
              const [px, py] = P(b.st.lat, b.st.lng);
              const n = el('text', { x: px, y: py - 13, 'text-anchor': 'middle', fill: COLORS[vi], 'font-size': 13, 'font-weight': 600, 'font-family': 'Readex Pro', opacity: 0 }, labels);
              n.textContent = String(b.st.si + 1); fade(n, 1, 300);
            }
            await wait(2300);
          }
          // what each van got, in the corner the roads leave empty (the depot is in the other)
          VANS.forEach((v, vi) => {
            const w = 220, h = 32, lx = wide ? L.map.x + shift + 24 : 16, ly = L.H - 24 - (2 - vi) * (h + 8);
            const g = el('g', { opacity: 0 }, labels);
            el('rect', { x: lx, y: ly, width: w, height: h, rx: 8, fill: '#0A0E27', stroke: COLORS[vi], 'stroke-opacity': 0.55 }, g);
            el('circle', { cx: rtl ? lx + w - 16 : lx + 16, cy: ly + h / 2, r: 4, fill: COLORS[vi] }, g);
            const tx = el('text', { x: rtl ? lx + w - 28 : lx + 28, y: ly + 21, fill: '#ECEFF7', 'font-size': 13, 'font-family': 'Readex Pro', 'text-anchor': 'start' }, g);
            if (rtl) tx.setAttribute('direction', 'rtl');
            tx.textContent = `${t('hw.van')} ${vi + 1} · ${v.km.toFixed(1)} km · ${v.load}/35 kg`;
            fade(g, 1, 400);
          });
          await wait(5500);
          if (my !== token) return;
          for (const n of [roads, pins, labels]) fade(n, 0, 500);
          bubbles.forEach(b => fade(b.fo, 0, 500));
          await wait(700);
        }
      })();
    };

    const io = new IntersectionObserver(es => { inView = es.some(e => e.isIntersecting); }, { threshold: 0.2 });
    io.observe(stage.current!);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(build, 250); };
    addEventListener('resize', onResize);
    build();
    return () => { token++; io.disconnect(); removeEventListener('resize', onResize); clearTimeout(rt); };
  }, [lang, t]);

  return (
    <section id="how-it-works" className="wh">
      <div className="wh-wrap">
        <div className="wh-head">
          <div>
            <p className="wh-label">{t('hw.label')}</p>
            <h2>{t('hw.h2')}</h2>
          </div>
          <ol className="wh-acts" ref={actsRef}>
            <li><i>1</i><span>{t('hw.a1')}</span></li>
            <li><i>2</i><span>{t('hw.a2')}</span></li>
            <li><i>3</i><span>{t('hw.a3')}</span></li>
          </ol>
        </div>
        <div className="wh-stage" ref={stage}><svg ref={svgRef} role="img" aria-label={t('hw.cap')} /></div>
        <p className="wh-cap">{t('hw.cap')}</p>
      </div>
    </section>
  );
};
