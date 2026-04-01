import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { optimizeRoute } from '../../services/api';
import { useUsage } from '../../hooks/useUsage';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/ui/Toast';
import { GoldButton } from '../../components/ui/GoldButton';
import { OutlineButton } from '../../components/ui/OutlineButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CountryDropdown } from '../../components/ui/CountryDropdown';
import type { RouteOptimizerResponse, VehicleRoute } from '../../types';

// ── Haversine distance (km) between two lat/lng points ───────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate road distance for stops visited in input order (sequential baseline).
// Road factor 1.35 is a conservative urban Middle East average (straight-line → road).
function sequentialRoadDistKm(
  depot: { lat: number; lng: number },
  stops: { lat: number; lng: number }[],
  roadFactor = 1.35,
): number {
  const pts = [depot, ...stops, depot];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
  }
  return total * roadFactor;
}

// ── OSRM Road Routing ─────────────────────────────────────────────────────────
async function getRoadRoute(coords: [number, number][]): Promise<[number, number][]> {
  if (coords.length < 2) return coords;
  try {
    const coordStr = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(id);
    const json = await res.json();
    if (json.routes?.[0]?.geometry?.coordinates) {
      return json.routes[0].geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
    }
  } catch { /* fall through to straight lines */ }
  return coords;
}

// ── Map fit helper ────────────────────────────────────────────────────────────
// hasFitted ref ensures we only call fitBounds once per MapContainer mount,
// so hovering stops (which re-renders MapTab) never resets the user's zoom.
const FitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (hasFitted.current || positions.length === 0) return;
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    else map.setView(positions[0], 13);
    hasFitted.current = true;
  }, [positions, map]);
  return null;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const depotIcon = L.divIcon({
  html: `<div style="width:34px;height:34px;background:#F5C842;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(245,200,66,0.5);">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
		<g fill="none" stroke="#0A0E27" stroke-width="1.5">
			<path stroke-linecap="round" d="M22 22H2" />
			<path stroke-linecap="round" d="M20 22V11M4 22V11" opacity="0.5" />
			<path stroke-linejoin="round" d="M16.528 2H7.472c-1.203 0-1.804 0-2.287.299c-.484.298-.753.836-1.29 1.912L2.49 7.76c-.324.82-.608 1.786-.062 2.479A2 2 0 0 0 6 9a2 2 0 1 0 4 0a2 2 0 1 0 4 0a2 2 0 1 0 4 0a2 2 0 0 0 3.571 1.238c.546-.693.262-1.659-.062-2.479l-1.404-3.548c-.537-1.076-.806-1.614-1.29-1.912C18.332 2 17.731 2 16.528 2Z" />
			<path stroke-linecap="round" d="M9.5 21.5v-3c0-.935 0-1.402.201-1.75a1.5 1.5 0 0 1 .549-.549C10.598 16 11.065 16 12 16s1.402 0 1.75.201a1.5 1.5 0 0 1 .549.549c.201.348.201.815.201 1.75v3" opacity="0.5" />
		</g>
	</svg>
  </div>`,
  className: '', iconAnchor: [17, 17],
});
const makeStopIcon = (n: number) => L.divIcon({
  html: `<div style="width:28px;height:28px;background:#0A0E27;border:2px solid #F5C842;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#F5C842;font-family:Sora,sans-serif;">${n}</div>`,
  className: '', iconAnchor: [14, 14],
});
const makeHoverIcon = (n: number) => L.divIcon({
  html: `<div style="width:32px;height:32px;background:#F5C842;border:2px solid #FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0A0E27;font-family:Sora,sans-serif;">${n}</div>`,
  className: '', iconAnchor: [16, 16],
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormStop {
  address: string; lat: string; lng: string;
  weight: string; volume: string; service_time: string;
}
interface FormVehicle { vehicle_id: string; cap_weight: string; cap_volume: string; }
interface FormValues {
  depot_address: string; depot_lat: string; depot_lng: string;
  stops: FormStop[];
  vehicles: FormVehicle[];
  country: string; city: string;
  objective: 'balanced' | 'distance' | 'time';
  normalize: boolean;
}

const chartGridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.07)' };
const chartAxisStyle = { fill: 'rgba(255,255,255,0.45)', fontSize: 10 };
type Tab = 'summary' | 'map' | 'sequence' | 'analytics';

const LOADING_MSGS = [
  'Geocoding addresses…',
  'Building distance matrix…',
  'Running optimization algorithm…',
  'Finalizing route…',
];

// ── Field styles ──────────────────────────────────────────────────────────────
const fld: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF', fontSize: '13px',
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: "'Inter', sans-serif",
  transition: 'border-color 0.2s',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'rgba(255,255,255,0.5)', marginBottom: '4px', letterSpacing: '0.02em',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const RouteOptimizerPage: React.FC = () => {
  const { usage, increment } = useUsage();
  const { toast } = useToast();
  const { isMobile, isTablet } = useBreakpoint();

  const [result,       setResult]       = useState<RouteOptimizerResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState(0);
  const [loadingPct,   setLoadingPct]   = useState(0);
  const [activeTab,    setActiveTab]    = useState<Tab>('summary');
  const [seqView,      setSeqView]      = useState<'timeline' | 'table'>('timeline');
  const [hoveredStop,  setHoveredStop]  = useState<number | null>(null);
  const [routeLine,    setRouteLine]    = useState<[number, number][]>([]);
  const [mobileView,   setMobileView]   = useState<'form' | 'results'>('form');
  const routeLineRef      = useRef<[number, number][]>([]);
  const depotRef          = useRef<{ lat: number; lng: number }>({ lat: 25.1371, lng: 55.2306 });
  const sequentialDistRef = useRef<number>(0); // baseline km for real impact calculation
  const loadingTimer      = useRef<ReturnType<typeof setInterval> | null>(null);

  const canUseOptimizer = !usage || usage.routeOptimizerCount < usage.routeOptimizerLimit;

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      depot_address: '',
      depot_lat: '', depot_lng: '',
      stops: [
        { address: '', lat: '', lng: '', weight: '', volume: '', service_time: '' },
      ],
      vehicles: [{ vehicle_id: '', cap_weight: '', cap_volume: '' }],
      country: 'AE', city: '', objective: 'balanced', normalize: false,
    },
  });

  const { fields: stopFields, append: addStop, remove: removeStop } = useFieldArray({ control, name: 'stops' });
  const { fields: vehFields,  append: addVeh,  remove: removeVeh  } = useFieldArray({ control, name: 'vehicles' });

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    if (!canUseOptimizer) { toast({ type: 'error', title: 'Route optimizer limit reached', message: 'Upgrade your plan to continue.' }); return; }
    setLoading(true); setLoadingPct(0); setLoadingMsg(0); setResult(null);

    // Fake progress bar
    const start = Date.now();
    const total = 30000;
    loadingTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setLoadingPct(Math.min(90, (elapsed / total) * 90));
      setLoadingMsg(Math.floor(elapsed / 7500) % LOADING_MSGS.length);
    }, 200);

    try {
      // Check + increment usage (log a meaningful summary for the activity feed)
      const summary = `${data.stops.length} stop${data.stops.length !== 1 ? 's' : ''} · ${data.depot_address.slice(0, 60)}`;
      const { ok, limitReached } = await increment('route_optimizer', summary);
      if (!ok && limitReached) { toast({ type: 'error', title: 'Usage limit reached' }); return; }
      if (!ok) { /* Backend unreachable — proceed anyway for demo */ }

      const depotLat = parseFloat(data.depot_lat);
      const depotLng = parseFloat(data.depot_lng);
      depotRef.current = { lat: depotLat, lng: depotLng };

      // Compute real sequential baseline BEFORE calling the API
      const inputStops = data.stops
        .map(s => ({ lat: parseFloat(s.lat), lng: parseFloat(s.lng) }))
        .filter(s => !isNaN(s.lat) && !isNaN(s.lng));
      sequentialDistRef.current = sequentialRoadDistKm(depotRef.current, inputStops);

      const payload: import('../../types').RouteOptimizerRequest = {
        country:                data.country,
        city:                   data.city,
        normalize_addresses:    data.normalize,
        optimization_objective: data.objective,
        depot: {
          address: data.depot_address,
          lat:     depotLat,
          lng:     depotLng,
        },
        stops: data.stops.map(s => ({
          address:       s.address,
          lat:           parseFloat(s.lat),
          lng:           parseFloat(s.lng),
          demand_weight: parseFloat(s.weight)        || 0,
          demand_volume: parseFloat(s.volume)        || 0,
          service_time:  parseFloat(s.service_time)  || 0,
        })),
        vehicles: data.vehicles.map(v => ({
          id:              v.vehicle_id,
          capacity_weight: parseFloat(v.cap_weight) || 1000,
          capacity_volume: parseFloat(v.cap_volume) || 50,
        })),
      };
      const res = await optimizeRoute(payload);
      if (clearLoadingTimer()) {};
      setLoadingPct(100);
      await new Promise(r => setTimeout(r, 300));
      setResult(res);
      setActiveTab('summary');
      toast({ type: 'success', title: 'Route optimized!', message: `${res.num_stops_assigned} stops assigned across ${res.num_vehicles_used} vehicle(s).` });

      // Pre-fetch OSRM route for Map tab
      if (res.routes?.[0]?.stops) {
        const route = res.routes[0];
        const { lat: dLat, lng: dLng } = depotRef.current;
        const coords: [number, number][] = [
          [dLat, dLng],
          ...route.stops.map(s => [s.lat, s.lng] as [number, number]),
          [dLat, dLng],
        ];
        getRoadRoute(coords).then(line => {
          routeLineRef.current = line;
          setRouteLine(line);
        });
      }
    } catch (err: unknown) {
      clearLoadingTimer();
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Optimization failed. Please try again.';
      toast({ type: 'error', title: 'Optimization failed', message: msg });
    } finally {
      clearLoadingTimer();
      setLoading(false);
    }
  };

  const clearLoadingTimer = () => {
    if (loadingTimer.current) { clearInterval(loadingTimer.current); loadingTimer.current = null; }
    return true;
  };
  useEffect(() => () => { clearLoadingTimer(); }, []);

  // Auto-switch to results panel on mobile once optimization completes
  useEffect(() => {
    if (result && isMobile) setMobileView('results');
  }, [result, isMobile]);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // ── Left Panel (Form) ──────────────────────────────────────────────────────
  const LeftPanel = (
    <div style={{
      width: isMobile ? '100%' : isTablet ? '360px' : '420px',
      flexShrink: 0,
      background: 'rgba(10,14,39,0.95)',
      borderRight: isMobile ? 'none' : '1px solid rgba(245,200,66,0.1)',
      borderBottom: isMobile ? '1px solid rgba(245,200,66,0.1)' : 'none',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>Route Optimizer</h2>
        {usage && (
          <p style={{ fontSize: '12px', color: usage.routeOptimizerCount >= usage.routeOptimizerLimit ? '#EF4444' : 'rgba(255,255,255,0.4)', margin: 0 }}>
            <span style={{ fontWeight: 700, color: usage.routeOptimizerCount >= usage.routeOptimizerLimit ? '#EF4444' : '#F5C842' }}>{usage.routeOptimizerCount}</span>
            {' / '}{usage.routeOptimizerLimit} requests used
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* DEPOT */}
        <Section icon="solar:home-2-bold-duotone" title="Depot — Starting Point" color="#F5C842">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={lbl}>Depot Address</label>
              <input style={fld} placeholder="e.g. Al Quoz Industrial Area, Dubai" {...register('depot_address', { required: true })}
                onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={lbl}>Latitude</label>
                <input style={fld} placeholder="e.g. 25.1371" type="number" step="any" {...register('depot_lat', { required: true })}
                  onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <label style={lbl}>Longitude</label>
                <input style={fld} placeholder="e.g. 55.2306" type="number" step="any" {...register('depot_lng', { required: true })}
                  onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '8px 0 0', lineHeight: 1.5 }}>The depot is where all vehicles start and end their route.</p>
        </Section>

        {/* STOPS */}
        <Section icon="solar:map-point-wave-bold-duotone" title="Delivery Stops" badge={`${stopFields.length} stops`} color="#10B981">
          {stopFields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>Stop {i + 1}</span>
                {stopFields.length > 1 && (
                  <button type="button" onClick={() => removeStop(i)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#EF4444', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <label style={lbl}>Delivery Address</label>
                <input style={fld} placeholder="e.g. Dubai Mall, Downtown Dubai" {...register(`stops.${i}.address`, { required: true })}
                  onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                <div>
                  <label style={lbl}>Latitude</label>
                  <input style={fld} placeholder="e.g. 25.1972" type="number" step="any" {...register(`stops.${i}.lat`)}
                    onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
                <div>
                  <label style={lbl}>Longitude</label>
                  <input style={fld} placeholder="e.g. 55.2744" type="number" step="any" {...register(`stops.${i}.lng`)}
                    onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '6px' }}>
                <StopField label="Weight" unit="kg" icon="solar:scale-bold-duotone" color="#F5C842"
                  input={<input style={fld} placeholder="e.g. 15" type="number" step="any" {...register(`stops.${i}.weight`)}
                    onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                />
                <StopField label="Volume" unit="m³" icon="solar:box-bold-duotone" color="#A855F7"
                  input={<input style={fld} placeholder="e.g. 1.2" type="number" step="any" {...register(`stops.${i}.volume`)}
                    onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                />
                <StopField label="Service" unit="min" icon="solar:clock-circle-bold-duotone" color="#3B82F6"
                  input={<input style={fld} placeholder="e.g. 10" type="number" step="any" {...register(`stops.${i}.service_time`)}
                    onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                />
              </div>
            </motion.div>
          ))}
          <OutlineButton size="sm" type="button"
            onClick={() => addStop({ address: '', lat: '', lng: '', weight: '', volume: '', service_time: '' })}>
            <Icon icon="solar:add-circle-bold" width={14} />Add Stop
          </OutlineButton>
        </Section>

        {/* VEHICLES */}
        <Section icon="solar:bus-bold-duotone" title="Fleet" badge={`${vehFields.length} vehicle${vehFields.length > 1 ? 's' : ''}`} color="#3B82F6">
          {vehFields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>Vehicle {i + 1}</span>
                {vehFields.length > 1 && (
                  <button type="button" onClick={() => removeVeh(i)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#EF4444', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <label style={lbl}>Vehicle ID / Name</label>
                <input style={fld} placeholder="e.g. Truck-01 or Van-A" {...register(`vehicles.${i}.vehicle_id`)}
                  onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={lbl}>Weight Capacity (kg)</label>
                  <input style={fld} placeholder="e.g. 1000" type="number" {...register(`vehicles.${i}.cap_weight`)}
                    onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
                <div>
                  <label style={lbl}>Volume Capacity (m³)</label>
                  <input style={fld} placeholder="e.g. 50" type="number" {...register(`vehicles.${i}.cap_volume`)}
                    onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
              </div>
            </motion.div>
          ))}
          <OutlineButton size="sm" type="button"
            onClick={() => addVeh({ vehicle_id: '', cap_weight: '', cap_volume: '' })}>
            <Icon icon="solar:add-circle-bold" width={14} />Add Vehicle
          </OutlineButton>
        </Section>

        {/* SETTINGS */}
        <Section icon="solar:settings-bold-duotone" title="Settings" color="#94A3B8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <CountryDropdown
                  label="Country"
                  value={field.value}
                  onChange={field.onChange}
                  compact
                />
              )}
            />
            <div>
              <label style={lbl}>City</label>
              <input style={fld} placeholder="e.g. Dubai" {...register('city')}
                onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
          </div>
          <div>
            <label style={lbl}>Optimization Objective</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
              {(['balanced', 'distance', 'time'] as const).map(obj => (
                <label key={obj} style={{ flex: 1 }}>
                  <input type="radio" value={obj} {...register('objective')} style={{ display: 'none' }} />
                  <PillOption selected={false} label={obj.charAt(0).toUpperCase() + obj.slice(1)} name="objective" value={obj} register={register} />
                </label>
              ))}
            </div>
          </div>
        </Section>

        <div style={{ padding: '8px 0 16px' }}>
          <GoldButton type="submit" fullWidth size="lg" loading={loading} disabled={!canUseOptimizer}>
            {!loading && <Icon icon="solar:routing-2-bold-duotone" width={17} />}
            {loading ? `Optimizing… ${Math.round(loadingPct)}%` : 'Optimize Route'}
          </GoldButton>
          {!canUseOptimizer && <p style={{ textAlign: 'center', fontSize: '12px', color: '#EF4444', marginTop: '8px' }}>Usage limit reached — upgrade to continue</p>}
        </div>
      </form>
    </div>
  );

  // ── Right Panel (Results) ──────────────────────────────────────────────────
  const RightPanel = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
      overflow: isMobile ? 'visible' : 'hidden',
      minHeight: isMobile ? 'calc(100vh - 160px)' : undefined,
    }}>
      {!result && !loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            icon="solar:routing-2-bold-duotone"
            title="Ready to optimize"
            description="Configure your depot, stops, and fleet on the left, then click Optimize Route to see results here."
          />
        </div>
      )}

      {loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ width: 56, height: 56, border: '4px solid rgba(245,200,66,0.15)', borderTopColor: '#F5C842', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.p key={loadingMsg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: 600, margin: '0 0 16px' }}>
                {LOADING_MSGS[loadingMsg]}
              </motion.p>
            </AnimatePresence>
            {/* Progress bar */}
            <div style={{ width: 280, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', margin: '0 auto' }}>
              <motion.div animate={{ width: `${loadingPct}%` }} transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #F5C842, #D4A017)', borderRadius: 3 }} />
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>This may take up to 30 seconds</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? undefined : '100%', flex: isMobile ? 1 : undefined, overflow: isMobile ? 'visible' : 'hidden' }}>
          {/* Tab Bar — desktop/tablet only; mobile tabs live in the sticky header above */}
          {!isMobile && (
            <div style={{
              display: 'flex', gap: '4px',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0, overflowX: 'auto',
            }}>
              {([
                { key: 'summary',   icon: 'solar:chart-square-bold-duotone',   label: 'Summary' },
                { key: 'map',       icon: 'solar:map-point-wave-bold-duotone', label: 'Map' },
                { key: 'sequence',  icon: 'solar:list-bold-duotone',           label: 'Sequence' },
                { key: 'analytics', icon: 'solar:graph-up-bold-duotone',       label: 'Analytics' },
              ] as { key: Tab; icon: string; label: string }[]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: isTablet ? '8px 10px' : '8px 14px',
                    flexShrink: 0,
                    background: activeTab === t.key ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activeTab === t.key ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    fontSize: isTablet ? '12px' : '13px', fontWeight: 600,
                    color: activeTab === t.key ? '#F5C842' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>
                  <Icon icon={t.icon} width={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: isMobile ? '16px' : '20px' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === 'summary'   && <SummaryTab result={result} formatTime={formatTime} sequentialDistKm={sequentialDistRef.current} />}
                {activeTab === 'map'       && <MapTab result={result} routeLine={routeLine} hoveredStop={hoveredStop} setHoveredStop={setHoveredStop} depot={depotRef.current} />}
                {activeTab === 'sequence'  && <SequenceTab result={result} view={seqView} setView={setSeqView} hoveredStop={hoveredStop} setHoveredStop={setHoveredStop} formatTime={formatTime} />}
                {activeTab === 'analytics' && <AnalyticsTab result={result} formatTime={formatTime} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? undefined : 'calc(100vh - 108px)',
      minHeight: isMobile ? 'calc(100vh - 108px)' : undefined,
      margin: '-24px',
      overflow: isMobile ? 'visible' : 'hidden',
    }}>
      {/* Mobile sticky header — Configure/Results toggle + result tabs in one block */}
      {isMobile && (
        <div style={{
          background: 'rgba(10,14,39,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
        }}>
          {/* Row 1: Configure / Results toggle */}
          <div style={{ display: 'flex', gap: '6px', padding: '10px 12px 8px' }}>
            {(['form', 'results'] as const).map(v => (
              <button key={v} type="button" onClick={() => setMobileView(v)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, border: '1px solid',
                  borderColor: mobileView === v ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.1)',
                  background: mobileView === v ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.03)',
                  color: mobileView === v ? '#F5C842' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                <Icon icon={v === 'form' ? 'solar:settings-bold-duotone' : 'solar:chart-square-bold-duotone'} width={15} />
                {v === 'form' ? 'Configure' : 'Results'}
                {v === 'results' && (result || loading) && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: loading ? '#F5C842' : '#10B981', display: 'inline-block' }} />
                )}
              </button>
            ))}
          </div>
          {/* Row 2: Result tabs — only when viewing results and result exists */}
          {mobileView === 'results' && result && !loading && (
            <div style={{ display: 'flex', gap: '4px', padding: '0 12px 10px' }}>
              {([
                { key: 'summary',   icon: 'solar:chart-square-bold-duotone',   label: 'Summary' },
                { key: 'map',       icon: 'solar:map-point-wave-bold-duotone', label: 'Map' },
                { key: 'sequence',  icon: 'solar:list-bold-duotone',           label: 'Sequence' },
                { key: 'analytics', icon: 'solar:graph-up-bold-duotone',       label: 'Analytics' },
              ] as { key: Tab; icon: string; label: string }[]).map(t => (
                <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 4px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600, border: '1px solid', whiteSpace: 'nowrap',
                    borderColor: activeTab === t.key ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.08)',
                    background: activeTab === t.key ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.03)',
                    color: activeTab === t.key ? '#F5C842' : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.2s',
                  }}>
                  <Icon icon={t.icon} width={13} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(!isMobile || mobileView === 'form') && LeftPanel}
      {(!isMobile || mobileView === 'results') && RightPanel}
    </div>
  );
};

// ── Stop field with micro label ───────────────────────────────────────────────
const StopField: React.FC<{ label: string; unit: string; icon: string; color: string; input: React.ReactNode }> = ({ label, unit, icon, color, input }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
      <Icon icon={icon} width={11} color={color} />
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{label} <span style={{ color: 'rgba(255,255,255,0.22)' }}>({unit})</span></span>
    </div>
    {input}
  </div>
);

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section: React.FC<{ icon: string; title: string; badge?: string; color: string; children: React.ReactNode }> = ({ icon, title, badge, color, children }) => (
  <div style={{ marginBottom: '0' }}>
    {/* Divider */}
    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
    {/* Section header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0 10px' }}>
      <div style={{ width: 28, height: 28, borderRadius: '8px', background: `${color}20`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon icon={icon} width={15} color={color} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', flex: 1 }}>{title}</span>
      {badge && <span style={{ fontSize: '11px', fontWeight: 700, background: `${color}20`, color, padding: '2px 8px', borderRadius: '20px' }}>{badge}</span>}
    </div>
    <div style={{ paddingBottom: '16px' }}>{children}</div>
  </div>
);

// ── Radio pill helper ─────────────────────────────────────────────────────────
const PillOption: React.FC<{ selected: boolean; label: string; name: string; value: string; register: ReturnType<typeof useForm<FormValues>>['register'] }> = ({ label, name, value, register }) => (
  <div style={{ position: 'relative' }}>
    <input type="radio" id={`${name}_${value}`} value={value} {...register(name as keyof FormValues)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
    <label htmlFor={`${name}_${value}`} style={{
      display: 'block', textAlign: 'center', padding: '7px 10px', fontSize: '12px', fontWeight: 600,
      border: '1px solid rgba(245,200,66,0.25)', borderRadius: '8px', cursor: 'pointer',
      color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = '#F5C842')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(245,200,66,0.25)')}
    >
      {label}
    </label>
  </div>
);

// ── Summary Tab ───────────────────────────────────────────────────────────────
const SummaryTab: React.FC<{
  result: RouteOptimizerResponse;
  formatTime: (m: number) => string;
  sequentialDistKm: number;
}> = ({ result, formatTime, sequentialDistKm }) => {
  const { isMobile } = useBreakpoint();
  const totalStops   = result.routes.reduce((a, r) => a + r.stops.length, 0);
  const deliveryRate = result.total_time_minutes > 0
    ? ((result.num_stops_assigned / result.total_time_minutes) * 60).toFixed(1)
    : '—';
  const avgKmPerStop = result.num_stops_assigned > 0
    ? (result.total_distance_km / result.num_stops_assigned).toFixed(1)
    : '—';
  const avgMinPerStop = result.num_stops_assigned > 0
    ? (result.total_time_minutes / result.num_stops_assigned).toFixed(0)
    : '—';

  // Real impact: compare against computed sequential baseline
  const hasBaseline  = sequentialDistKm > 0 && sequentialDistKm > result.total_distance_km;
  const savedKmReal  = hasBaseline ? (sequentialDistKm - result.total_distance_km) : 0;
  const savedPct     = hasBaseline ? (savedKmReal / sequentialDistKm) * 100 : 0;
  // Time saved proportional to distance saved (same avg speed assumption)
  const savedMinReal = hasBaseline ? Math.round(result.total_time_minutes * (savedPct / 100)) : 0;

  const savedKm  = hasBaseline ? savedKmReal.toFixed(1) : '—';
  const savedMin = savedMinReal;

  const stats = [
    { icon: 'solar:routing-2-bold-duotone',      label: 'Total Distance',   value: `${result.total_distance_km?.toFixed(2)} km`, color: '#F5C842' },
    { icon: 'solar:clock-circle-bold-duotone',   label: 'Total Time',       value: formatTime(result.total_time_minutes),          color: '#3B82F6' },
    { icon: 'solar:map-point-wave-bold-duotone', label: 'Stops Assigned',   value: `${result.num_stops_assigned} / ${totalStops}`,  color: '#10B981' },
    { icon: 'solar:delivery-bold-duotone',       label: 'Delivery Speed',   value: `${deliveryRate}/hr`,                            color: '#A855F7' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Top stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'rgba(12,17,45,0.8)', border: `1px solid ${s.color}25`, borderRadius: '12px', padding: '16px' }}>
            <Icon icon={s.icon} width={20} color={s.color} />
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: 800, color: s.color, margin: '8px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Wayn Impact card ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,200,66,0.08) 0%, rgba(10,14,39,0.9) 60%)',
        border: '1px solid rgba(245,200,66,0.3)', borderRadius: '14px', padding: '20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,200,66,0.08)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(245,200,66,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon="solar:magic-stick-3-bold-duotone" width={18} color="#F5C842" />
          </div>
          <div>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Wayn Optimization Impact</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>vs. unoptimized sequential routing</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          <ImpactMetric
            icon="solar:routing-2-bold-duotone" color="#F5C842"
            value={hasBaseline ? `${savedKm} km` : '—'}
            label="Distance Saved"
            sub={hasBaseline ? `${savedPct.toFixed(0)}% vs sequential` : 'no baseline'}
          />
          <ImpactMetric
            icon="solar:clock-circle-bold-duotone" color="#3B82F6"
            value={hasBaseline ? formatTime(savedMin) : '—'}
            label="Time Saved"
            sub={hasBaseline ? `vs input order` : 'no baseline'}
          />
          <ImpactMetric
            icon="solar:target-bold-duotone" color="#10B981"
            value={`${avgKmPerStop} km`}
            label="Avg per Stop"
            sub={`${avgMinPerStop} min/stop`}
          />
        </div>

        {hasBaseline && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '10px 0 0', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            Sequential baseline: {sequentialDistKm.toFixed(1)} km (Haversine × 1.35 road factor) → Optimized: {result.total_distance_km.toFixed(2)} km
          </p>
        )}
      </div>

      {/* ── Fleet Performance ── */}
      <div>
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Fleet Performance</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.routes.map((route, ri) => {
            const stops     = route.stops.length;
            const distKm    = (route.distance_meters / 1000).toFixed(1);
            const totalSvcMin = route.stops.reduce((a, s) => a + (s.service_time_minutes ?? 0), 0);
            const driveMin  = route.time_minutes - totalSvcMin;
            return (
              <div key={ri} style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(245,200,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon icon="solar:bus-bold-duotone" width={18} color="#F5C842" />
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{route.vehicle_id}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{stops} stops · {distKm} km</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '3px 10px', borderRadius: '20px' }}>Active</span>
                </div>

                {/* Mini metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  <MiniStat icon="solar:clock-circle-bold-duotone" color="#3B82F6" value={formatTime(driveMin)} label="Drive time" />
                  <MiniStat icon="solar:wrench-minimalistic-bold-duotone" color="#A855F7" value={formatTime(totalSvcMin)} label="Service time" />
                  <MiniStat icon="solar:map-point-wave-bold-duotone" color="#10B981" value={`${stops}`} label="Deliveries" />
                </div>

                {/* Load bars */}
                <CapBar label="Weight Load" used={route.load_weight} cap={route.capacity_weight} color="#F5C842" unit="kg" />
                <CapBar label="Volume Load" used={route.load_volume} cap={route.capacity_volume} color="#3B82F6" unit="m³" />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

// ── Small helpers for SummaryTab ──────────────────────────────────────────────
const ImpactMetric: React.FC<{ icon: string; color: string; value: string; label: string; sub: string }> = ({ icon, color, value, label, sub }) => (
  <div style={{ background: 'rgba(10,14,39,0.6)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
    <Icon icon={icon} width={16} color={color} />
    <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 800, color, margin: '6px 0 1px' }}>{value}</p>
    <p style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', margin: '0 0 1px' }}>{label}</p>
    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{sub}</p>
  </div>
);

const MiniStat: React.FC<{ icon: string; color: string; value: string; label: string }> = ({ icon, color, value, label }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
    <Icon icon={icon} width={14} color={color} />
    <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 800, color, margin: '4px 0 2px' }}>{value}</p>
    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
  </div>
);

const CapBar: React.FC<{ label: string; used: number; cap: number; color: string; unit: string }> = ({ label, used, cap, color, unit }) => {
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{used?.toFixed(1)} / {cap} {unit} — {pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

// ── Map Tab ───────────────────────────────────────────────────────────────────
const MapTab: React.FC<{
  result: RouteOptimizerResponse; routeLine: [number, number][];
  hoveredStop: number | null; setHoveredStop: (n: number | null) => void;
  depot: { lat: number; lng: number };
}> = ({ result, routeLine, hoveredStop, setHoveredStop, depot }) => {
  const { isMobile, isTablet } = useBreakpoint();
  const route = result.routes?.[0] as VehicleRoute | undefined;

  // Stable reference — only recalculates if depot coords or stops list changes,
  // NOT when hoveredStop changes, preventing FitBounds from re-running on hover.
  const allPositions = useMemo<[number, number][]>(() => {
    if (!route) return [];
    return [
      [depot.lat, depot.lng],
      ...route.stops.map(s => [s.lat, s.lng] as [number, number]),
    ];
  }, [depot.lat, depot.lng, route]);

  if (!route) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>No route data available.</p>;

  return (
    <div style={{
      height: isMobile ? '55vw' : isTablet ? '420px' : 'calc(100vh - 195px)',
      minHeight: isMobile ? '280px' : '380px',
      borderRadius: '12px', overflow: 'hidden',
      border: '1px solid rgba(245,200,66,0.15)', position: 'relative',
    }}>
      <MapContainer center={[25.2, 55.27]} zoom={11} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution="" />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" attribution="" />

        {/* Route line: glow */}
        {routeLine.length > 1 && <Polyline positions={routeLine} color="#10B981" weight={10} opacity={0.15} />}
        {routeLine.length > 1 && <Polyline positions={routeLine} color="#10B981" weight={4} opacity={0.9} />}
        {/* Fallback straight line */}
        {routeLine.length <= 1 && allPositions.length > 1 && <Polyline positions={allPositions} color="#10B981" weight={3} dashArray="8 6" opacity={0.6} />}

        {/* Depot marker (real coordinates from form) */}
        <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
          <Popup>
            <div style={{ minWidth: 140 }}>
              <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#F5C842' }}>Depot</p>
              <p style={{ margin: 0, fontSize: 12 }}>Starting & ending point</p>
              <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{depot.lat.toFixed(5)}, {depot.lng.toFixed(5)}</p>
            </div>
          </Popup>
        </Marker>

        {/* Stop markers */}
        {route.stops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]}
            icon={hoveredStop === i ? makeHoverIcon(stop.sequence) : makeStopIcon(stop.sequence)}
            eventHandlers={{ mouseover: () => setHoveredStop(i), mouseout: () => setHoveredStop(null) }}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#F5C842' }}>Stop {stop.sequence}</p>
                <p style={{ margin: '0 0 4px', fontSize: 12 }}>{stop.address}</p>
                {stop.arrival_time_minutes != null && <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>⏱ Arrival: {stop.arrival_time_minutes} min</p>}
                {stop.demand_weight > 0 && <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>⚖️ {stop.demand_weight} kg · 📦 {stop.demand_volume} m³</p>}
                {stop.service_time_minutes > 0 && <p style={{ margin: 0, fontSize: 11, color: '#888' }}>🔧 Service: {stop.service_time_minutes} min</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds positions={allPositions} />
      </MapContainer>
    </div>
  );
};

// ── Road Timeline sub-components ─────────────────────────────────────────────
const RoadNode: React.FC<{
  label: string; isDepot: boolean; color: string;
  address: string; stats: { icon: string; color: string; val: string }[];
  hovered: boolean; side: 'left' | 'right';
  onEnter: () => void; onLeave: () => void;
}> = ({ label, isDepot, color, address, stats, hovered, side, onEnter, onLeave }) => {
  const isLeft = side === 'left';
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isLeft ? 'row' : 'row-reverse', cursor: 'default', marginBottom: '2px' }}>
      {/* Node circle */}
      <div style={{
        width: isDepot ? 42 : 36, height: isDepot ? 42 : 36, borderRadius: '50%', flexShrink: 0,
        background: hovered ? color : isDepot ? `${color}20` : 'rgba(10,14,39,0.95)',
        border: `2.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hovered || isDepot ? `0 0 16px ${color}55` : 'none',
        transition: 'all 0.2s', zIndex: 2,
      }}>
        {isDepot
          ? <Icon icon={label === 'START' ? 'solar:home-2-bold-duotone' : 'solar:flag-bold-duotone'} width={18} color={hovered ? '#0A0E27' : color} />
          : <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '12px', fontWeight: 800, color: hovered ? '#0A0E27' : color }}>{label}</span>
        }
      </div>
      {/* Content card */}
      <div style={{
        flex: 1, background: hovered ? 'rgba(245,200,66,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px', padding: '10px 14px', transition: 'all 0.2s',
        textAlign: isLeft ? 'left' : 'right',
      }}>
        <p style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '13px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</p>
        {stats.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: isLeft ? 'flex-start' : 'flex-end' }}>
            {stats.map((s, si) => (
              <span key={si} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                <Icon icon={s.icon} width={11} color={s.color} />{s.val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RoadConnector: React.FC<{ fromSide: 'left' | 'right'; toSide: 'left' | 'right'; isFirst: boolean }> = ({ toSide }) => (
  <div style={{ display: 'flex', justifyContent: toSide === 'left' ? 'flex-start' : 'flex-end', padding: '0 17px', margin: '2px 0' }}>
    <div style={{
      width: 3, height: 28,
      background: 'repeating-linear-gradient(to bottom, rgba(245,200,66,0.5) 0px, rgba(245,200,66,0.5) 5px, transparent 5px, transparent 10px)',
      borderRadius: 2,
    }} />
  </div>
);

const RoadTurn: React.FC<{ fromSide: 'left' | 'right' }> = ({ fromSide }) => (
  <div style={{ position: 'relative', height: 28, margin: '2px 0' }}>
    <div style={{
      position: 'absolute',
      left: fromSide === 'left' ? 'auto' : '17px',
      right: fromSide === 'left' ? '17px' : 'auto',
      top: 0, bottom: 0, width: 3,
      background: 'repeating-linear-gradient(to bottom, rgba(245,200,66,0.4) 0px, rgba(245,200,66,0.4) 5px, transparent 5px, transparent 10px)',
    }} />
    <div style={{
      position: 'absolute',
      left: fromSide === 'right' ? 20 : undefined,
      right: fromSide === 'left' ? 20 : undefined,
      top: '50%', transform: 'translateY(-50%)',
      height: 3, width: 'calc(100% - 40px)',
      background: 'repeating-linear-gradient(to right, rgba(245,200,66,0.4) 0px, rgba(245,200,66,0.4) 8px, transparent 8px, transparent 16px)',
    }} />
    <div style={{
      position: 'absolute',
      left: fromSide === 'left' ? 17 : 'auto',
      right: fromSide === 'right' ? 17 : 'auto',
      top: 0, bottom: 0, width: 3,
      background: 'repeating-linear-gradient(to bottom, rgba(245,200,66,0.4) 0px, rgba(245,200,66,0.4) 5px, transparent 5px, transparent 10px)',
    }} />
  </div>
);

// ── Sequence Tab ──────────────────────────────────────────────────────────────
const SequenceTab: React.FC<{
  result: RouteOptimizerResponse; view: 'timeline' | 'table'; setView: (v: 'timeline' | 'table') => void;
  hoveredStop: number | null; setHoveredStop: (n: number | null) => void;
  formatTime: (m: number) => string;
}> = ({ result, view, setView, hoveredStop, setHoveredStop, formatTime: _formatTime }) => {
  const route = result.routes?.[0] as VehicleRoute | undefined;
  if (!route) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['timeline', 'table'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(245,200,66,0.25)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: view === v ? 'rgba(245,200,66,0.12)' : 'transparent', color: view === v ? '#F5C842' : 'rgba(255,255,255,0.5)' }}>
            {v === 'timeline' ? 'Timeline' : 'Table'}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        <div style={{ padding: '8px 4px' }}>
          {/* Depot start node */}
          <RoadNode
            label="START" isDepot color="#F5C842"
            address="Depot — Starting Point"
            stats={[]} hovered={false}
            onEnter={() => {}} onLeave={() => {}}
            side="left"
          />

          {route.stops.map((stop, i) => {
            const side = i % 2 === 0 ? 'right' : 'left';
            const isLast = i === route.stops.length - 1;
            const nextSide = !isLast ? ((i + 1) % 2 === 0 ? 'right' : 'left') : null;
            return (
              <React.Fragment key={i}>
                {/* Connector road segment */}
                <RoadConnector fromSide={i === 0 ? 'left' : (i % 2 === 0 ? 'right' : 'left')} toSide={side} isFirst={i === 0} />
                <RoadNode
                  label={String(stop.sequence)}
                  isDepot={false}
                  color={hoveredStop === i ? '#F5C842' : '#FFFFFF'}
                  address={stop.address}
                  stats={[
                    stop.arrival_time_minutes != null ? { icon: 'solar:clock-circle-bold-duotone', color: '#3B82F6', val: `${stop.arrival_time_minutes} min` } : null,
                    stop.demand_weight > 0 ? { icon: 'solar:scale-bold-duotone', color: '#F5C842', val: `${stop.demand_weight} kg` } : null,
                    stop.demand_volume > 0 ? { icon: 'solar:box-bold-duotone', color: '#A855F7', val: `${stop.demand_volume} m³` } : null,
                    stop.service_time_minutes > 0 ? { icon: 'solar:wrench-minimalistic-bold-duotone', color: '#10B981', val: `${stop.service_time_minutes} min svc` } : null,
                  ].filter(Boolean) as { icon: string; color: string; val: string }[]}
                  hovered={hoveredStop === i}
                  onEnter={() => setHoveredStop(i)}
                  onLeave={() => setHoveredStop(null)}
                  side={side}
                />
                {/* Turn connector at end of row */}
                {!isLast && nextSide !== side && <RoadTurn fromSide={side} />}
              </React.Fragment>
            );
          })}

          {/* Road back to depot */}
          <RoadConnector fromSide={route.stops.length % 2 === 0 ? 'right' : 'left'} toSide="left" isFirst={false} />
          <RoadNode
            label="END" isDepot color="#10B981"
            address="Depot — Route Complete"
            stats={[]} hovered={false}
            onEnter={() => {}} onLeave={() => {}}
            side="left"
          />
        </div>
      )}

      {view === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['#', 'Address', 'Arrival', 'Weight', 'Volume', 'Service'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {route.stops.map((s, i) => (
                <tr key={i} onMouseEnter={() => setHoveredStop(i)} onMouseLeave={() => setHoveredStop(null)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: hoveredStop === i ? 'rgba(245,200,66,0.05)' : 'transparent', transition: 'background 0.15s', cursor: 'default' }}>
                  <td style={{ padding: '10px 12px', color: '#F5C842', fontWeight: 800 }}>{s.sequence}</td>
                  <td style={{ padding: '10px 12px', color: '#FFFFFF', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{s.arrival_time_minutes ?? '—'} min</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{s.demand_weight ?? 0} kg</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{s.demand_volume ?? 0} m³</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{s.service_time_minutes ?? 0} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<{ result: RouteOptimizerResponse; formatTime: (m: number) => string }> = ({ result }) => {
  const { isMobile } = useBreakpoint();
  const route = result.routes?.[0] as VehicleRoute | undefined;
  if (!route) return null;

  const arrivalData = route.stops.map(s => ({ stop: `#${s.sequence}`, arrival: s.arrival_time_minutes ?? 0 }));
  const demandData  = route.stops.map(s => ({ stop: `#${s.sequence}`, weight: s.demand_weight ?? 0, volume: (s.demand_volume ?? 0) * 10 }));

  const weightPct = route.capacity_weight > 0 ? (route.load_weight / route.capacity_weight) * 100 : 0;
  const volPct    = route.capacity_volume  > 0 ? (route.load_volume  / route.capacity_volume)  * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Arrival Distribution */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #F5C842', paddingLeft: '10px' }}>Arrival Time Distribution</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={arrivalData}>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="stop" tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="arrival" name="Arrival (min)" fill="#F5C842" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Demand per Stop */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', borderLeft: '3px solid #3B82F6', paddingLeft: '10px' }}>Demand per Stop</h4>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px 13px' }}>Volume scaled ×10 for visibility</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={demandData}>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="stop" tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="weight" name="Weight (kg)" fill="#F5C842" radius={[3, 3, 0, 0]} />
            <Bar dataKey="volume" name="Volume ×10" fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Capacity Utilization */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #10B981', paddingLeft: '10px' }}>Capacity Utilization</h4>
        <CapBar label="Weight Utilization" used={route.load_weight}  cap={route.capacity_weight} color="#F5C842" unit="kg" />
        <CapBar label="Volume Utilization" used={route.load_volume}  cap={route.capacity_volume} color="#3B82F6" unit="m³" />
        {(weightPct < 50 && volPct < 50) && (
          <p style={{ fontSize: '13px', color: '#10B981', marginTop: '8px' }}>✅ Well within capacity</p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Avg Service Time', value: route.stops.length > 0 ? `${(route.stops.reduce((a, s) => a + (s.service_time_minutes ?? 0), 0) / route.stops.length).toFixed(0)} min` : '—' },
          { label: 'Total Stops',     value: route.stops.length.toString() },
          { label: 'Total Load',      value: `${route.load_weight?.toFixed(1)} kg` },
          { label: 'Total Volume',    value: `${route.load_volume?.toFixed(1)} m³` },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: '#F5C842', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
