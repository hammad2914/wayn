import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import solarIcons from '@iconify-json/solar/icons.json';
import { useLanguage } from '../../contexts/LanguageContext';
import { COMPLEXITY_ROUTE_SEGS } from './complexityRoutes';

// Build an inline SVG string from the bundled Solar icon set (for Leaflet divIcon HTML)
function solSvg(name: string, size: number, color: string): string {
  const icon = ((solarIcons as any).icons as Record<string, { body: string }>)[name];
  if (!icon) return '';
  const w = (solarIcons as unknown as { width?: number }).width ?? 24;
  const h = (solarIcons as unknown as { height?: number }).height ?? 24;
  const body = icon.body.replace(/currentColor/g, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

// ─── OSRM Road Routing ───────────────────────────────────────────────────────
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function getRoadRoute(
  points: [number, number][],
  timeoutMs = 6000
): Promise<[number, number][]> {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return (data.routes[0].geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
    }
  } catch {
    clearTimeout(timer);
    // timeout or network error — fall back to straight line
  }
  return points;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCENE_NAMES = [
  'Address Search', 'Google Results', 'Wayn Result',
  'All Stops', 'Route Planning', 'Manual Route', 'Optimal Route',
];

const STOP_COORDS: [number, number][] = [
  [25.118, 55.200], [25.078, 55.140], [25.074, 55.132], [25.044, 55.119],
  [25.043, 55.226], [25.197, 55.274], [25.213, 55.263], [25.232, 55.290],
  [25.246, 55.303], [25.253, 55.303], [25.269, 55.297], [25.123, 55.383],
];
const DEPOT: [number, number] = [25.137, 55.231];
const ARABIC_TEXT = 'عند البقالة الكبيرة ورا الفيصلية، الشارع اللي فيه بنك الراجحي';

// Route waypoint orders (indices into STOP_COORDS)
const INEFF_INDICES = [0, 11, 3, 10, 8, 1, 6, 5, 9, 2, 7, 4];
const OPT_INDICES   = [3, 2, 1, 0, 4, 11, 7, 6, 5, 10, 9, 8];


type Visibility = {
  search: boolean; google: boolean; wayn: boolean;
  stops: boolean; planning: boolean; inefficient: boolean; optimal: boolean;
};
const HIDDEN: Visibility = {
  search: false, google: false, wayn: false,
  stops: false, planning: false, inefficient: false, optimal: false,
};

// ─── MapReadyHandler ──────────────────────────────────────────────────────────
const MapReadyHandler: React.FC<{ onReady: (map: L.Map) => void }> = ({ onReady }) => {
  const map = useMap();
  useEffect(() => { onReady(map); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// ─── CountUp ─────────────────────────────────────────────────────────────────
const CountUp: React.FC<{
  to: number; suffix?: string; duration?: number; start?: boolean;
}> = ({ to, suffix = '', duration = 2, start = true }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / (duration * 1000), 1);
      setVal(Math.round((1 - (1 - t) ** 3) * to));
      if (t < 1) requestAnimationFrame(tick);
      else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [to, duration, start]);
  return <>{val}{suffix}</>;
};

// ─── Panel shared style ───────────────────────────────────────────────────────
const PANEL: React.CSSProperties = {
  background: 'rgba(10,14,39,0.88)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(245,200,66,0.18)',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,200,66,0.05)',
  padding: '16px 20px',
  width: 310,
  pointerEvents: 'none',
};

const motionPanel = (vis: boolean) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: vis ? 1 : 0, y: vis ? 0 : 14 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
});

// ─── HeroSection ─────────────────────────────────────────────────────────────
export const HeroSection: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [scene, setScene] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [vis, setVis] = useState<Visibility>(HIDDEN);
  const [mapReady, setMapReady] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [startCount, setStartCount] = useState(false);
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  const mapRef             = useRef<L.Map | null>(null);
  const markersRef         = useRef<(L.CircleMarker | L.Marker)[]>([]);
  const polylinesRef       = useRef<L.Polyline[]>([]);
  const complexityLinesRef = useRef<L.Polyline[]>([]);
  const cancelledRef       = useRef(false);
  // Cache OSRM results so they are only fetched once, not every loop
  const routeCache         = useRef<Map<string, [number, number][]>>(new Map());

  // ── Navigation / jump / pause ──────────────────────────────────────────────
  // generationRef: increment to abort all async ops of the current scene
  const generationRef    = useRef(0);
  // targetSceneRef: >=0 means jump requested; read + reset at top of each loop
  const targetSceneRef   = useRef(-1);
  // currentSceneRef: lets the "prev" button know which scene is active
  const currentSceneRef  = useRef(0);
  const isPausedRef      = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  const jumpTo = useCallback((idx: number) => {
    const clamped = ((idx % 7) + 7) % 7;
    targetSceneRef.current = clamped;
    generationRef.current++;          // abort current async
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      generationRef.current++;        // wake the pause-wait loop
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      generationRef.current++;        // abort current scene mid-flight
    }
  }, []);

  const isTablet      = winW < 1024;
  const isSmallLaptop = winW >= 1024 && winW < 1340;
  const isMobile      = winW < 768;

  useEffect(() => {
    const fn = () => setWinW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setStartCount(true), 700);
    return () => clearTimeout(t);
  }, []);

  const clearMap = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];
    complexityLinesRef.current.forEach((p) => p.remove());
    complexityLinesRef.current = [];
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  // ─── Pre-fetch the 2 critical OSRM routes in the background ─────────────
  // Fire-and-forget — animation starts immediately; routes will be ready
  // by the time scenes 5 & 6 run (~20s into the first loop).
  useEffect(() => {
    if (!mapReady || isMobile) return;

    const ineffWaypoints: [number, number][] = [
      DEPOT, ...INEFF_INDICES.map((i) => STOP_COORDS[i]), DEPOT,
    ];
    const optWaypoints: [number, number][] = [
      DEPOT, ...OPT_INDICES.map((i) => STOP_COORDS[i]), DEPOT,
    ];

    getRoadRoute(ineffWaypoints).then((coords) => {
      routeCache.current.set('ineff', coords);
    });
    getRoadRoute(optWaypoints).then((coords) => {
      routeCache.current.set('opt', coords);
    });

  }, [mapReady, isMobile]);

  // ─── 7-scene animation loop (scene-indexed, jump + pause capable) ───────────
  useEffect(() => {
    if (!mapReady || isMobile) return;
    cancelledRef.current = false;

    const runLoop = async () => {
      const map = mapRef.current!;

      // Abortable sleep: resolves early when generationRef changes or component unmounts
      const sl = (ms: number, gen: number): Promise<void> => new Promise((resolve) => {
        let rem = ms;
        const tick = () => {
          if (cancelledRef.current || generationRef.current !== gen || rem <= 0) { resolve(); return; }
          const w = Math.min(20, rem); rem -= w;
          setTimeout(tick, w);
        };
        setTimeout(tick, Math.min(20, ms));
      });

      // Throws 'unmounted' or 'aborted' depending on what triggered the abort
      const makeChk = (gen: number) => () => {
        if (cancelledRef.current) throw new Error('unmounted');
        if (generationRef.current !== gen) throw new Error('aborted');
      };

      // Instantly draw the grey complexity web + stops + depot (for direct scene jumps)
      const drawGreyWebInstant = () => {
        if (markersRef.current.length === 0) {
          for (const coord of STOP_COORDS) {
            const m = L.circleMarker(coord, {
              radius: 7, color: '#F5C842', fillColor: '#F5C842', fillOpacity: 0.85, weight: 2,
            }).addTo(map);
            markersRef.current.push(m);
          }
          const dIcon = L.divIcon({
            className: '',
            html: `<div style="filter:drop-shadow(0 0 6px rgba(245,200,66,0.85))">${solSvg('shop-2-line-duotone', 22, '#F5C842')}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          });
          markersRef.current.push(L.marker(DEPOT, { icon: dIcon }).addTo(map) as unknown as L.CircleMarker);
        }
        if (complexityLinesRef.current.length === 0) {
          for (const seg of COMPLEXITY_ROUTE_SEGS) {
            const ln = L.polyline(seg.path as L.LatLngExpression[], {
              color: '#9CA3AF', weight: 2.5, opacity: 0.65,
            }).addTo(map);
            complexityLinesRef.current.push(ln);
          }
        }
      };

      let sceneIdx = 0;

      while (!cancelledRef.current) {
        // ── Check for jump request ──────────────────────────────────────────
        if (targetSceneRef.current >= 0) {
          sceneIdx = targetSceneRef.current;
          targetSceneRef.current = -1;
          clearMap();
          setVis(HIDDEN);
          setTypedText('');
          // Snap map to overview for route scenes
          if (sceneIdx >= 3) map.setView([25.16, 55.22], 11.5);
        }

        const gen = generationRef.current;
        const chk = makeChk(gen);

        // Per-scene progressive drawer (uses abortable sl + chk)
        const drawProgressive = async (
          coords: [number, number][],
          options: L.PolylineOptions,
          totalMs = 1800
        ): Promise<L.Polyline> => {
          const poly = L.polyline([], options).addTo(map);
          polylinesRef.current.push(poly);
          if (coords.length === 0) return poly;
          const FRAME_MS = 16;
          const frames = Math.max(1, Math.round(totalMs / FRAME_MS));
          const ptsPerFrame = Math.ceil(coords.length / frames);
          const acc: L.LatLngExpression[] = [];
          let drawn = 0;
          while (drawn < coords.length) {
            chk();
            const end = Math.min(drawn + ptsPerFrame, coords.length);
            for (let i = drawn; i < end; i++) acc.push(coords[i]);
            poly.setLatLngs(acc);
            drawn = end;
            if (drawn < coords.length) await sl(FRAME_MS, gen);
          }
          return poly;
        };

        setScene(sceneIdx);
        currentSceneRef.current = sceneIdx;

        try {
          switch (sceneIdx) {
            case 0: {
              setVis({ ...HIDDEN, search: true });
              setTypedText('');
              map.flyTo([25.1671, 55.225], 11.5, { duration: 0.8 });
              for (let i = 0; i <= ARABIC_TEXT.length; i++) {
                chk();
                setTypedText(ARABIC_TEXT.slice(0, i));
                await sl(45, gen);
              }
              chk(); await sl(1500, gen); chk();
              break;
            }
            case 1: {
              setVis({ ...HIDDEN, google: true });
              map.flyTo([25.269, 55.298], 15, { duration: 1.5 });
              const redLocs: [number, number][] = [
                [25.2685, 55.2975], [25.271, 55.300],
                [25.267, 55.2960], [25.2695, 55.2990],
              ];
              for (const loc of redLocs) {
                chk();
                markersRef.current.push(
                  L.circleMarker(loc, { radius: 10, color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.75, weight: 2 }).addTo(map)
                );
                await sl(350, gen);
              }
              chk(); await sl(2500, gen); chk();
              break;
            }
            case 2: {
              setVis({ ...HIDDEN, wayn: true });
              map.flyTo([25.2692, 55.2977], 17, { duration: 1.5 });
              await sl(1700, gen); chk();
              markersRef.current.forEach((m) => m.remove());
              markersRef.current = [];
              const goldIcon = L.divIcon({
                className: '',
                html: `<div class="gold-marker-container"><div class="gold-ping-ring"></div><div class="gold-ping-dot"></div></div>`,
                iconSize: [24, 24], iconAnchor: [12, 12],
              });
              markersRef.current.push(L.marker([25.2692, 55.2977], { icon: goldIcon }).addTo(map) as unknown as L.CircleMarker);
              chk(); await sl(2500, gen); chk();
              break;
            }
            case 3: {
              setVis({ ...HIDDEN, stops: true });
              map.flyTo([25.16, 55.22], 11.5, { duration: 2.5 });
              await sl(700, gen); chk();
              markersRef.current.forEach((m) => m.remove());
              markersRef.current = [];
              for (const coord of STOP_COORDS) {
                chk();
                markersRef.current.push(
                  L.circleMarker(coord, { radius: 7, color: '#F5C842', fillColor: '#F5C842', fillOpacity: 0.85, weight: 2 }).addTo(map)
                );
                await sl(200, gen);
              }
              chk(); await sl(1500, gen); chk();
              break;
            }
            case 4: {
              setVis({ ...HIDDEN, planning: true });
              // Ensure stops visible when jumped here directly
              if (markersRef.current.length === 0) {
                for (const coord of STOP_COORDS) {
                  markersRef.current.push(
                    L.circleMarker(coord, { radius: 7, color: '#F5C842', fillColor: '#F5C842', fillOpacity: 0.85, weight: 2 }).addTo(map)
                  );
                }
              }
              const depotIcon4 = L.divIcon({
                className: '',
                html: `<div style="filter:drop-shadow(0 0 6px rgba(245,200,66,0.85))">${solSvg('shop-2-line-duotone', 22, '#F5C842')}</div>`,
                iconSize: [22, 22], iconAnchor: [11, 11],
              });
              markersRef.current.push(L.marker(DEPOT, { icon: depotIcon4 }).addTo(map) as unknown as L.CircleMarker);
              for (const seg of COMPLEXITY_ROUTE_SEGS) {
                chk();
                complexityLinesRef.current.push(
                  L.polyline(seg.path as L.LatLngExpression[], { color: '#9CA3AF', weight: 2.5, opacity: 0.65 }).addTo(map)
                );
                await sl(25, gen);
              }
              chk(); await sl(1500, gen); chk();
              break;
            }
            case 5: {
              setVis({ ...HIDDEN, inefficient: true });
              drawGreyWebInstant(); // no-op if already drawn; ensures state when jumped here
              polylinesRef.current.forEach((p) => p.remove());
              polylinesRef.current = [];
              const ineffCoords = routeCache.current.get('ineff') ?? [
                DEPOT, ...INEFF_INDICES.map((i) => STOP_COORDS[i]), DEPOT,
              ];
              await drawProgressive(ineffCoords, { color: '#EF4444', weight: 5, opacity: 1.0 }, 2000);
              chk(); await sl(1500, gen); chk();
              break;
            }
            case 6: {
              setVis({ ...HIDDEN, optimal: true });
              drawGreyWebInstant(); // no-op if already drawn; ensures state when jumped here
              polylinesRef.current.forEach((p) => p.remove());
              polylinesRef.current = [];
              const optCoords = routeCache.current.get('opt') ?? [
                DEPOT, ...OPT_INDICES.map((i) => STOP_COORDS[i]), DEPOT,
              ];
              await drawProgressive(optCoords, { color: '#10B981', weight: 6, opacity: 1.0 }, 2000);
              chk(); await sl(4000, gen); chk();
              break;
            }
          }
        } catch (e: unknown) {
          const msg = (e as Error).message;
          if (msg === 'unmounted' || cancelledRef.current) return;
          // 'aborted' — jump or pause was requested
          if (isPausedRef.current) {
            // Hold until unpaused or a jump comes in
            while (isPausedRef.current && !cancelledRef.current && targetSceneRef.current < 0) {
              await new Promise<void>((r) => setTimeout(r, 50));
            }
            if (cancelledRef.current) return;
          }
          continue; // re-evaluate jump target at top of while loop
        }

        // ── Scene completed normally ────────────────────────────────────────
        if (isPausedRef.current) {
          while (isPausedRef.current && !cancelledRef.current && targetSceneRef.current < 0) {
            await new Promise<void>((r) => setTimeout(r, 50));
          }
          if (cancelledRef.current) return;
          continue; // jump or resume — re-evaluate at top
        }

        // ── Advance to next scene ───────────────────────────────────────────
        sceneIdx = (sceneIdx + 1) % 7;
        if (sceneIdx === 0) {
          // Loop-end transition back to start
          setVis(HIDDEN);
          await new Promise<void>((r) => setTimeout(r, 800));
          if (cancelledRef.current) return;
          clearMap();
          map.flyTo([25.1671, 55.225], 11.5, { duration: 1.5 });
          await new Promise<void>((r) => setTimeout(r, 1600));
          if (cancelledRef.current) return;
        }
      }
    };

    runLoop();
    return () => { cancelledRef.current = true; };
  }, [mapReady, isMobile, clearMap]);

  // ─── JSX ─────────────────────────────────────────────────────────────────
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
  };

  return (
    <section
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        background: '#0A0E27',
      }}
    >
      {/* ── MAP LAYER ── */}
      {/* Outer div clips the 20px bleed; inner div oversizes to hide tile edges */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: -20, left: -20, right: -20, bottom: -20,
          opacity: tilesLoaded ? 1 : 0,
          transition: 'opacity 0.9s ease',
        }}>
          <MapContainer
            center={[25.1671, 55.225]}
            zoom={11.5}
            className="hero-map"
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            keyboard={false}
          >
            {/* Base layer: roads + areas, no text clutter */}
            <TileLayer
              className="hero-map-base"
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
              eventHandlers={{ load: () => setTilesLoaded(true) }}
            />
            {/* Labels layer: city names on top */}
            <TileLayer
              className="hero-map-labels"
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
              zIndex={10}
            />
            <MapReadyHandler onReady={handleMapReady} />
          </MapContainer>
        </div>
      </div>

      {/* ── SIDE GRADIENT (flips in RTL) ── */}
      <div
        style={{
          position: 'absolute',
          ...(isRTL ? { right: 0 } : { left: 0 }),
          top: 0, zIndex: 10,
          width: isTablet ? '100%' : '58%',
          height: '100%',
          background: isTablet
            ? 'linear-gradient(to bottom, rgba(10,14,39,0.90) 0%, rgba(10,14,39,0.75) 100%)'
            : isRTL
              ? 'linear-gradient(to left, #0A0E27 28%, rgba(10,14,39,0.85) 60%, transparent 100%)'
              : 'linear-gradient(to right, #0A0E27 28%, rgba(10,14,39,0.85) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── HERO TEXT ── */}
      <div
        style={{
          position: 'absolute',
          ...(isRTL ? { right: 0 } : { left: 0 }),
          // On mobile: sit below the 64px fixed navbar instead of centering
          ...(isMobile
            ? { top: 0, paddingTop: 76 }
            : { top: '50%', transform: 'translateY(-50%)' }),
          paddingLeft:  isRTL ? (isMobile ? 24 : 40) : (isMobile ? 24 : isTablet ? 48 : 80),
          paddingRight: isRTL ? (isMobile ? 24 : isTablet ? 48 : 80) : (isMobile ? 24 : 40),
          zIndex: 20,
          maxWidth: isTablet ? '100%' : '54%',
          width: isTablet ? '100%' : 'auto',
        }}
      >
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ textAlign: isMobile ? 'center' : isRTL ? 'right' : 'left' }}
        >
          {/* Label pill */}
          <motion.div variants={item} style={{ marginBottom: 24 }}>
              <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 18px', borderRadius: 9999,
              border: '1px solid rgba(245,200,66,0.45)',
              background: 'rgba(245,200,66,0.08)',
              color: '#F5C842', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
            }}>
              <Icon icon="solar:rocket-bold-duotone" width={16} />
              {t('hero.label')}
            </span>
          </motion.div>

          {/* H1 */}
          <motion.div variants={item} style={{ marginBottom: 20 }}>
            <h1 style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: isMobile ? 38 : isSmallLaptop ? 46 : 56,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              margin: 0,
            }}>
              <span style={{ color: '#FFFFFF', display: 'block' }}>{t('hero.h1Line1')}</span>
              <span style={{ color: '#F5C842', display: 'block' }}>{t('hero.h1Line2')}</span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div variants={item} style={{ marginBottom: 36 }}>
            <p style={{
              fontSize: isMobile ? 16 : 20,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6, margin: 0, maxWidth: 480,
              ...(isMobile ? { marginLeft: 'auto', marginRight: 'auto' } : {}),
            }}>
              {t('hero.subtitle')}
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={item}
            style={{
              display: 'flex', gap: 40, marginBottom: 40,
              ...(isMobile ? { justifyContent: 'center' } : {}),
            }}
          >
            {[
              { to: 99, suffix: '%', label: t('hero.stat1Label') },
              { to: 48, suffix: '%', label: t('hero.stat2Label') },
              { to: 3,  suffix: 's', label: t('hero.stat3Label') },
            ].map(({ to, suffix, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'Sora, sans-serif', fontSize: 36, fontWeight: 800,
                  color: '#F5C842', lineHeight: 1, marginBottom: 6,
                }}>
                  <CountUp to={to} suffix={suffix} start={startCount} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: '0.03em' }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Buttons */}
          <motion.div
            variants={item}
            style={{
              display: 'flex', gap: 14, flexWrap: 'wrap',
              ...(isMobile ? { justifyContent: 'center' } : {}),
            }}
          >
            <motion.button
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.03, boxShadow: '0 0 32px rgba(245,200,66,0.45)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: '#F5C842', color: '#0A0E27', border: 'none',
                borderRadius: 10, padding: '14px 30px',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t('hero.getStarted')}
                <Icon icon={isRTL ? 'solar:arrow-left-bold' : 'solar:arrow-right-bold'} width={16} />
              </span>
            </motion.button>
            <motion.button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              whileHover={{ background: 'rgba(245,200,66,0.12)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'transparent', color: '#F5C842',
                border: '1.5px solid rgba(245,200,66,0.7)',
                borderRadius: 10, padding: '14px 30px',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              {t('hero.watchDemo')}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── FLOATING PANELS (desktop only) ── */}
      {!isTablet && (
        <>
          {/* SCENE 0: Search panel */}
          <motion.div
            style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '10%' : '14%', zIndex: 20, ...PANEL, ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
            {...motionPanel(vis.search)}
          >
            <div style={{ marginBottom: 10, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('panel.addressInput')}
            </div>
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 14px', minHeight: 44,
            }}>
              <Icon icon="solar:magnifer-line-duotone" width={18} style={{ color: '#F5C842', flexShrink: 0, marginTop: 2 }} />
              <div
                dir="rtl"
                style={{
                  fontSize: 14, color: '#FFFFFF', fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5, flex: 1, wordBreak: 'break-word', minHeight: '1.5em',
                }}
              >
                {typedText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{
                    display: 'inline-block', width: 1.5, height: '1em',
                    background: '#F5C842', marginLeft: 2, verticalAlign: 'middle',
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* SCENE 1: Google results panel */}
          <motion.div
            style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '27%' : '32%', zIndex: 20, ...PANEL, ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
            {...motionPanel(vis.google)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon icon="solar:map-point-bold-duotone" width={18} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>{t('panel.googleMapsHeader')}</span>
            </div>
            {([
              t('panel.result1'), t('panel.result2'),
              t('panel.result3'), t('panel.result4'),
            ]).map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                fontSize: 13, color: 'rgba(255,255,255,0.6)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                {r}
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 12, color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon icon="solar:close-circle-bold" width={13} />
              {t('panel.whichCorrect')}
            </div>
          </motion.div>

          {/* SCENE 2: Wayn result panel */}
          <motion.div
            style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '55%' : '62%', zIndex: 20, ...PANEL, ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
            {...motionPanel(vis.wayn)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src="/wayn-full.png" alt="Wayn" style={{ height: 42, width: 'auto', objectFit: 'contain', flexShrink: 0, display: 'block' }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>{t('panel.streetName')}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{t('panel.district')}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#3B82F6', margin: '8px 0' }}>
              25.2692° N, 55.2977° E
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16,185,129,0.14)', borderRadius: 20, padding: '4px 12px',
              fontSize: 12, color: '#10B981', fontWeight: 600, marginBottom: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              {t('panel.confidence')}
            </div>
            <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon icon="solar:check-circle-bold" width={13} />
              {t('panel.exactLocation')}
            </div>
          </motion.div>

          {/* STATUS PANELS — scenes 3–6 */}
          <AnimatePresence mode="wait">
            {vis.stops && (
              <motion.div key="stops" style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '10%' : '14%', zIndex: 20, ...PANEL, ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#10B981', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon icon="solar:check-circle-bold" width={17} />
                  {t('panel.stopsNormalized')}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  {t('panel.stopsSubtext')}
                </div>
              </motion.div>
            )}
            {vis.planning && (
              <motion.div key="planning" style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '10%' : '14%', zIndex: 20, ...PANEL, ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>
                  {t('panel.routePlanning')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Icon icon="solar:settings-bold-duotone" width={16} style={{ color: '#F5C842' }} />
                  </motion.span>
                  {t('panel.calculating')}
                </div>
              </motion.div>
            )}
            {vis.inefficient && (
              <motion.div key="inefficient"
                style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '10%' : '14%', zIndex: 20, ...PANEL, border: '1px solid rgba(239,68,68,0.35)', ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon icon="solar:close-circle-bold" width={14} />
                  {t('panel.manualRoute')}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>462 km</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{t('panel.manualTime')}</div>
              </motion.div>
            )}
            {vis.optimal && (
              <motion.div key="optimal"
                style={{ position: 'absolute', [isRTL ? 'left' : 'right']: '4%', top: isSmallLaptop ? '10%' : '14%', zIndex: 20, ...PANEL, border: '1px solid rgba(16,185,129,0.35)', ...(isSmallLaptop && { transform: 'scale(0.82)', transformOrigin: isRTL ? 'top left' : 'top right' }) }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon icon="solar:star-shine-bold-duotone" width={15} style={{ color: '#10B981' }} />
                  {t('panel.waynOptimized')}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>238 km</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
                  {t('panel.optimalTime')}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', background: 'linear-gradient(90deg, #10B981, #34D399)', borderRadius: 4 }}
                    initial={{ width: '0%' }}
                    animate={{ width: '48.7%' }}
                    transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.5 }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#10B981', marginTop: 5, textAlign: isRTL ? 'left' : 'right', fontWeight: 600 }}>
                  {t('panel.distanceSaved')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── NAV CONTROLS — hidden on mobile (no animation there) ── */}
      {!isMobile && <div style={{
        position: 'absolute',
        bottom: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',
      }}>
        {/* Progress segments — click to jump */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {SCENE_NAMES.map((name, i) => (
            <div
              key={i}
              title={name}
              onClick={() => jumpTo(i)}
              style={{
                width: isMobile ? 22 : 30,
                height: 4,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background 0.3s, opacity 0.3s',
                background: i === scene ? '#F5C842' : i < scene ? 'rgba(245,200,66,0.55)' : 'rgba(255,255,255,0.18)',
                opacity: i === scene ? 1 : i < scene ? 0.8 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Prev / Pause / Label / Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Prev */}
          <motion.button
            onClick={() => jumpTo(scene - 1)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(10,14,39,0.75)',
              border: '1px solid rgba(245,200,66,0.4)',
              color: '#F5C842', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              lineHeight: 1,
            }}
          >
            ‹
          </motion.button>

          {/* Pause / Play */}
          <motion.button
            onClick={togglePause}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            title={isPaused ? 'Resume' : 'Pause'}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: isPaused ? 'rgba(245,200,66,0.18)' : 'rgba(10,14,39,0.75)',
              border: `1px solid ${isPaused ? 'rgba(245,200,66,0.9)' : 'rgba(245,200,66,0.4)'}`,
              color: '#F5C842', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              lineHeight: 1,
            }}
          >
            {isPaused ? '▶' : '⏸'}
          </motion.button>

          {/* Scene label */}
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.04em',
            minWidth: isMobile ? 90 : 120,
            textAlign: 'center',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {SCENE_NAMES[scene]}
          </div>

          {/* Next */}
          <motion.button
            onClick={() => jumpTo(scene + 1)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(10,14,39,0.75)',
              border: '1px solid rgba(245,200,66,0.4)',
              color: '#F5C842', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              lineHeight: 1,
            }}
          >
            ›
          </motion.button>
        </div>
      </div>}

      {/* ── ATTRIBUTION ── */}
      <div style={{
        position: 'absolute', bottom: 6, left: 8, zIndex: 20,
        fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4,
      }}>
        {'© '}
        <a href="https://carto.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>CARTO</a>
        {' © '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>OpenStreetMap</a>
        {' contributors'}
      </div>
    </section>
  );
};
