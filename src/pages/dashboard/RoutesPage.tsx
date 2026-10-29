import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { optimizeRoute } from '../../services/api';
import { useUsage } from '../../hooks/useUsage';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { fill, vanColor } from '../../components/dispatch/shared';
import { baseMap, divIcon, roadLine, errorOf, COUNTRIES } from '../../components/app/shared';
import { CountrySelect } from '../../components/app/ui';
import type { RouteOptimizerResponse } from '../../types';

interface StopIn { address: string; kg: string }
interface VanIn { name: string; cap: string }

const EXAMPLE = {
  country: 'SA', city: 'Riyadh', depot: 'Al Sulay, Riyadh',
  stops: [['حي الياسمين، الرياض', 6], ['حي المغرزات، الرياض', 5], ['حي الروضة، الرياض', 4], ['حي النسيم الغربي، الرياض', 15],
    ['حي السليمانية، الرياض', 3], ['حي العليا، الرياض', 9], ['حي النخيل، الرياض', 8], ['حي الملقا، الرياض', 12]] as [string, number][],
};

/** "address, 12" or "address<TAB>12" per line; the number at the end is the kg */
const parseList = (text: string): StopIn[] => text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length >= 3).map(l => {
  const m = l.match(/^(.*?)[,\t،]\s*(\d{1,5}(?:\.\d+)?)\s*(?:kg|كغ)?$/i);
  return m ? { address: m[1].trim(), kg: m[2] } : { address: l, kg: '' };
});

const PlanMap: React.FC<{ res: RouteOptimizerResponse; lines: [number, number][][] }> = ({ res, lines }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  useEffect(() => {
    const m = baseMap(el.current!);
    L.control.zoom({ position: 'topright' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); };
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: [number, number][] = [];
    res.routes.forEach((r, i) => {
      const color = vanColor(i);
      const depot = r.vehicle_info?.start_location;
      const line = lines[i]?.length ? lines[i] : [...(depot ? [[depot.lat, depot.lng] as [number, number]] : []), ...r.stops.map(s => [s.lat, s.lng] as [number, number])];
      L.polyline(line, { color, weight: 4, opacity: 0.9 }).addTo(g);
      pts.push(...line);
      r.stops.forEach((s, si) => L.marker([s.lat, s.lng], { icon: divIcon(`<span class="ap-st" style="border-color:${color};color:${color}">${si + 1}</span>`, 22) }).addTo(g));
      if (depot && i === 0) L.marker([depot.lat, depot.lng], { icon: divIcon('<div class="ap-dep"></div>', 16) }).addTo(g);
    });
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 15 });
  }, [res, lines]);
  return <div className="ap-rmap" ref={el} />;
};

export const RoutesPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { canUseOptimizer, increment } = useUsage();
  const [country, setCountry] = useState(() => COUNTRIES.some(c => c[0] === user?.country) ? user!.country! : 'SA');
  const [city, setCity] = useState(() => { try { return localStorage.getItem('wayn-city') ?? ''; } catch { return ''; } });
  const [depot, setDepot] = useState('');
  const [stops, setStops] = useState<StopIn[]>([{ address: '', kg: '' }, { address: '', kg: '' }]);
  const [vans, setVans] = useState<VanIn[]>([{ name: '', cap: '500' }]);
  const [objective, setObjective] = useState<'distance' | 'time'>('distance');
  const [paste, setPaste] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<RouteOptimizerResponse | null>(null);
  const [lines, setLines] = useState<[number, number][][]>([]);

  const filled = stops.filter(s => s.address.trim().length >= 3);
  const vanName = (i: number) => vans[i]?.name.trim() || fill(t('ap.r.van'), { n: i + 1 });
  const setStop = (i: number, v: Partial<StopIn>) => setStops(ss => ss.map((s, j) => (j === i ? { ...s, ...v } : s)));
  const setVan = (i: number, v: Partial<VanIn>) => setVans(vs => vs.map((s, j) => (j === i ? { ...s, ...v } : s)));
  const pasted = paste ? parseList(paste) : [];

  const example = () => {
    setCountry(EXAMPLE.country); setCity(EXAMPLE.city); setDepot(EXAMPLE.depot);
    setStops(EXAMPLE.stops.map(([address, kg]) => ({ address, kg: String(kg) })));
    setVans([{ name: '', cap: '40' }, { name: '', cap: '40' }]);
  };
  const clear = () => {
    setDepot(''); setStops([{ address: '', kg: '' }, { address: '', kg: '' }]); setVans([{ name: '', cap: '500' }]);
    setRes(null); setLines([]); setErr('');
  };

  const submit = async () => {
    if (!canUseOptimizer) { setErr(t('ap.r.limit')); return; }
    setBusy(true); setErr(''); setRes(null); setLines([]);
    try {
      const r = await optimizeRoute({
        country, city: city.trim(), optimization_objective: objective,
        depot: { address: depot.trim() },
        stops: filled.map(s => ({ address: s.address.trim(), demand_weight: parseFloat(s.kg) || 0 })),
        vehicles: vans.map((v, i) => ({ id: vanName(i), capacity_weight: parseFloat(v.cap) || 1000 })),
      });
      if (!r.success || !r.routes?.length) { setErr(r.error || t('ap.r.fail')); return; }
      setRes(r);
      try { localStorage.setItem('wayn-city', city.trim()); } catch { /* private mode */ }
      // counted only once it worked
      const { limitReached } = await increment('route_optimizer', `${filled.length} stops · ${depot.trim().slice(0, 60)}`);
      if (limitReached) setErr(t('ap.r.limit'));
      Promise.all(r.routes.map(rt => {
        const d = rt.vehicle_info?.start_location;
        const pts = rt.stops.map(s => [s.lat, s.lng] as [number, number]);
        return roadLine(d ? [[d.lat, d.lng], ...pts, [d.lat, d.lng]] : pts);
      })).then(setLines);
    } catch (e) {
      setErr(errorOf(e, t('ap.r.fail')));
    } finally { setBusy(false); }
  };

  const used = res?.routes ?? [];
  const longest = used.length ? Math.max(...used.map(r => r.time_minutes)) : 0;
  const left = res ? filled.length - res.num_stops_assigned : 0;
  const ready = depot.trim().length >= 3 && filled.length > 0 && vans.every(v => parseFloat(v.cap) > 0);

  return (
    <div className="ap-page">
      <div className="ap-title">
        <div><h1>{t('ap.routes')}</h1><p>{t('ap.r.sub')}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ap-btn ghost" onClick={example} disabled={busy}>{t('ap.a.example')}</button>
          <button className="ap-btn ghost" onClick={clear} disabled={busy}>{t('ap.r.clear')}</button>
        </div>
      </div>

      <div className="ap-rt">
        <div className="ap-card">
          <div className="ap-blk">
            <div className="ap-two">
              <label className="ap-field">{t('ap.country')}<CountrySelect value={country} onChange={setCountry} lang={lang} /></label>
              <label className="ap-field">{t('ap.city')}<input className="ap-in" value={city} onChange={e => setCity(e.target.value)} placeholder={lang === 'ar' ? 'الرياض' : 'Riyadh'} maxLength={60} /></label>
            </div>
          </div>
          <div className="ap-blk">
            <h3>{t('ap.r.from')}</h3>
            <input className="ap-in" dir="auto" value={depot} onChange={e => setDepot(e.target.value)} placeholder={t('ap.r.fromPh')} maxLength={200} />
          </div>
          <div className="ap-blk">
            <h3>{t('ap.r.stops')} <small className="num">{fill(t('ap.r.nStops'), { n: filled.length })} · kg</small></h3>
            {stops.map((s, i) => (
              <div className="ap-stop" key={i}>
                <span className="k num">{i + 1}</span>
                <input className="ap-in" dir="auto" value={s.address} onChange={e => setStop(i, { address: e.target.value })} placeholder={t('ap.r.stopPh')} maxLength={200} />
                <input className="ap-in num" inputMode="decimal" value={s.kg} onChange={e => setStop(i, { kg: e.target.value.replace(/[^\d.]/g, '') })} placeholder="kg" />
                <button className="ap-x" aria-label="×" disabled={stops.length === 1} onClick={() => setStops(ss => ss.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {paste !== null ? (
              <div className="ap-paste">
                <textarea className="ap-in" dir="auto" autoFocus value={paste} onChange={e => setPaste(e.target.value)} placeholder={t('ap.r.pasteHint')} />
                <div className="acts">
                  <button className="ap-mini" disabled={!pasted.length} onClick={() => {
                    setStops(ss => [...ss.filter(s => s.address.trim()), ...pasted].slice(0, 60)); setPaste(null);
                  }}>{fill(t('ap.r.pasteAdd'), { n: pasted.length })}</button>
                  <button className="ap-mini" onClick={() => setPaste(null)}>×</button>
                </div>
              </div>
            ) : (
              <div className="acts">
                <button className="ap-mini" disabled={stops.length >= 60} onClick={() => setStops(ss => [...ss, { address: '', kg: '' }])}>{t('ap.r.addStop')}</button>
                <button className="ap-mini" onClick={() => setPaste('')}>{t('ap.r.paste')}</button>
              </div>
            )}
          </div>
          <div className="ap-blk">
            <h3>{t('ap.r.vans')} <small>{t('ap.r.cap')}</small></h3>
            {vans.map((v, i) => (
              <div className="ap-vrow" key={i}>
                <i style={{ background: vanColor(i) }} />
                <input className="ap-in" value={v.name} onChange={e => setVan(i, { name: e.target.value })} placeholder={fill(t('ap.r.van'), { n: i + 1 })} maxLength={40} />
                <input className="ap-in num" inputMode="decimal" value={v.cap} onChange={e => setVan(i, { cap: e.target.value.replace(/[^\d.]/g, '') })} />
                <button className="ap-x" aria-label="×" disabled={vans.length === 1} onClick={() => setVans(vs => vs.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {vans.length < 10 && <div className="acts"><button className="ap-mini" onClick={() => setVans(vs => [...vs, { name: '', cap: vs.at(-1)?.cap ?? '500' }])}>{t('ap.r.addVan')}</button></div>}
          </div>
          <div className="ap-blk">
            <h3>{t('ap.r.keep')}</h3>
            <div className="ap-seg">
              <button className={objective === 'distance' ? 'on' : ''} onClick={() => setObjective('distance')}>{t('ap.r.distance')}</button>
              <button className={objective === 'time' ? 'on' : ''} onClick={() => setObjective('time')}>{t('ap.r.time')}</button>
            </div>
          </div>
          <div className="ap-blk">
            {err && <div className="ap-error">{err}</div>}
            <button className="ap-btn wide" disabled={busy || !ready || !canUseOptimizer} onClick={submit}>{busy ? t('ap.a.busy') : t('ap.r.go')}</button>
          </div>
        </div>

        <div className="ap-card ap-out">
          {busy ? (
            <div className="ap-busy"><div className="bar"><b /></div>{t('ap.r.busy')}</div>
          ) : !res ? (
            <div className="ap-empty"><b>{t('ap.r.emptyT')}</b>{t('ap.r.emptyP')}</div>
          ) : (
            <>
              <div className="h">
                <h2>{t('ap.r.plan')}</h2>
                <div className="ap-tot">
                  <span><b className="num">{res.num_vehicles_used}</b>{t('ap.r.tVans')}</span>
                  <span><b className="num">{res.num_stops_assigned}</b>{t('ap.r.tStops')}</span>
                  <span><b className="num">{res.total_distance_km.toFixed(0)} km</b>{t('ap.r.tAll')}</span>
                  <span><b className="num">{Math.floor(longest / 60)}h {Math.round(longest % 60)}m</b>{t('ap.r.tLong')}</span>
                </div>
              </div>
              {left > 0 && <div className="ap-error" style={{ padding: '10px 20px 0' }}>{fill(t('ap.r.left'), { n: left })}</div>}
              <PlanMap res={res} lines={lines} />
              <div className="ap-vans">
                {used.map((r, i) => {
                  const color = vanColor(i);
                  const cap = r.capacity_weight || 0;
                  return (
                    <div className="ap-van" key={r.vehicle_id}>
                      <div className="vh"><i style={{ background: color }} /><b>{r.vehicle_id}</b>
                        <span className="num">{(r.distance_meters / 1000).toFixed(1)} km · {Math.round(r.time_minutes)} min</span></div>
                      {cap > 0 && (
                        <div className="ap-load"><span>{t('ap.r.load')}</span><span className="num">{fill(t('ap.r.of'), { a: Math.round(r.load_weight), b: Math.round(cap) })}</span>
                          <div className="t"><b style={{ width: `${Math.min(100, (r.load_weight / cap) * 100)}%`, background: color }} /></div></div>
                      )}
                      <ol>
                        {r.stops.map((s, si) => (
                          <li key={si}>
                            <span className="ap-st num" style={{ borderColor: color, color }}>{si + 1}</span>
                            <div dir="auto">{s.address}</div>
                            <span className="num">{s.demand_weight ? `${s.demand_weight} kg` : ''}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
