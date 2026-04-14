import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import TabTour, { useTabTour } from '../../components/ui/walktour/Walktour';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
} from 'recharts';
import { optimizeRoute } from '../../services/api';
import { useUsage } from '../../hooks/useUsage';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useToast } from '../../components/ui/Toast';
import { GoldButton } from '../../components/ui/GoldButton';
import { OutlineButton } from '../../components/ui/OutlineButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tooltip } from '../../components/ui/Tooltip';
import { CountryDropdown } from '../../components/ui/CountryDropdown';
import { useLanguage } from '../../contexts/LanguageContext';
import type { RouteOptimizerResponse, VehicleRoute } from '../../types';

// ── Vehicle colour palette (one colour per vehicle route) ─────────────────────
const VEHICLE_COLORS = ['#10B981', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

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
const makeStopIcon = (n: number, color = '#F5C842') => L.divIcon({
  html: `<div style="width:28px;height:28px;background:#0A0E27;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${color};font-family:Sora,sans-serif;">${n}</div>`,
  className: '', iconAnchor: [14, 14],
});
const makeHoverIcon = (n: number, color = '#F5C842') => L.divIcon({
  html: `<div style="width:32px;height:32px;background:${color};border:2px solid #FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0A0E27;font-family:Sora,sans-serif;">${n}</div>`,
  className: '', iconAnchor: [16, 16],
});

// ── Map Picker ────────────────────────────────────────────────────────────────
interface PickedLocation { lat: number; lng: number; address: string; }

const pickCrosshairIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="6" fill="#F5C842" opacity="0.9"/>
      <circle cx="16" cy="16" r="5" stroke="#0A0E27" stroke-width="2" fill="none"/>
      <line x1="16" y1="2" x2="16" y2="10" stroke="#F5C842" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="22" x2="16" y2="30" stroke="#F5C842" stroke-width="2" stroke-linecap="round"/>
      <line x1="2" y1="16" x2="10" y2="16" stroke="#F5C842" stroke-width="2" stroke-linecap="round"/>
      <line x1="22" y1="16" x2="30" y2="16" stroke="#F5C842" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </div>`,
  className: '', iconAnchor: [0, 0],
});

const MapClickCapture: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
};

import type { TranslationKey } from '../../translations';

const MapPickerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
  lang: 'en' | 'ar';
  t: (k: TranslationKey) => string;
  initialLat?: number;
  initialLng?: number;
}> = ({ open, onClose, onConfirm, lang, t, initialLat, initialLng }) => {
  const [pin,      setPin]      = useState<{ lat: number; lng: number } | null>(null);
  const [address,  setAddress]  = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      const startLat = initialLat ?? 25.2048;
      const startLng = initialLng ?? 55.2708;
      setPin({ lat: startLat, lng: startLng });
      setAddress('');
      reverseGeocode(startLat, startLng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setFetching(true);
    setAddress('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${lang === 'ar' ? 'ar' : 'en'}`,
        { signal: abortRef.current.signal, headers: { 'Accept-Language': lang === 'ar' ? 'ar' : 'en' } },
      );
      const json = await res.json();
      setAddress(json.display_name ?? '');
    } catch {
      setAddress('');
    } finally {
      setFetching(false);
    }
  }, [lang]);

  const handlePick = useCallback((lat: number, lng: number) => {
    setPin({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  if (!open) return null;

  const isRTL = lang === 'ar';
  const centerLat = pin?.lat ?? initialLat ?? 25.2048;
  const centerLng = pin?.lng ?? initialLng ?? 55.2708;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#0D1235',
          border: '1px solid rgba(245,200,66,0.2)',
          borderRadius: '16px',
          width: '100%', maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          direction: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(245,200,66,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon="solar:map-point-bold-duotone" width={18} color="#F5C842" />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: '15px', color: '#FFFFFF' }}>{t('route.mapPickerTitle')}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{t('route.mapPickerHint')}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px', display: 'flex', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <Icon icon="solar:close-bold" width={18} />
          </button>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: '360px', position: 'relative' }}>
          <MapContainer
            key={`picker-${open}`}
            center={[centerLat, centerLng]}
            zoom={13}
            style={{ width: '100%', height: '100%', minHeight: '360px', cursor: 'crosshair' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            <MapClickCapture onPick={handlePick} />
            {pin && (
              <Marker position={[pin.lat, pin.lng]} icon={pickCrosshairIcon} />
            )}
          </MapContainer>

          {/* Crosshair hint overlay */}
          <div style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,14,39,0.85)', border: '1px solid rgba(245,200,66,0.2)',
            borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.6)',
            pointerEvents: 'none', zIndex: 1000, whiteSpace: 'nowrap',
          }}>
            <Icon icon="solar:cursor-bold" width={11} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
            {t('route.mapPickerHint')}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
          flexShrink: 0,
        }}>
          {/* Address preview */}
          {pin && (
            <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.12)', borderRadius: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#F5C842', letterSpacing: '0.06em', marginBottom: '4px', textTransform: 'uppercase' }}>
                {t('route.mapPickerAddress')}
              </div>
              {fetching ? (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon icon="solar:refresh-bold" width={12} style={{ animation: 'spin 1s linear infinite' }} color="rgba(255,255,255,0.4)" />
                  {t('route.mapPickerFetching')}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#FFFFFF', lineHeight: 1.5 }}>
                  {address || t('route.mapPickerNoAddr')}
                </div>
              )}
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
              {t('route.mapPickerCancel')}
            </button>
            <button
              disabled={!pin || fetching}
              onClick={() => pin && onConfirm({ lat: pin.lat, lng: pin.lng, address: address || t('route.mapPickerNoAddr') })}
              style={{
                padding: '9px 18px', borderRadius: '9px',
                background: pin && !fetching ? 'linear-gradient(135deg, #F5C842, #D4A017)' : 'rgba(255,255,255,0.06)',
                border: 'none', color: pin && !fetching ? '#0A0E27' : 'rgba(255,255,255,0.3)',
                fontSize: '13px', fontWeight: 700, cursor: pin && !fetching ? 'pointer' : 'not-allowed',
                fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { if (pin && !fetching) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Icon icon="solar:check-bold" width={14} />
              {t('route.mapPickerConfirm')}
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormStop {
  address: string;
  weight: string; volume: string; service_time: string;
}
interface FormVehicle { vehicle_id: string; cap_weight: string; cap_volume: string; }
interface FormValues {
  depot_address: string;
  stops: FormStop[];
  vehicles: FormVehicle[];
  country: string; city: string;
  objective: 'distance' | 'time';
}

const chartGridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.07)' };
const chartAxisStyle = { fill: 'rgba(255,255,255,0.45)', fontSize: 10 };
type Tab = 'summary' | 'map' | 'sequence' | 'analytics';

const LOADING_MSGS_EN = [
  'Geocoding addresses…',
  'Building distance matrix…',
  'Running optimization algorithm…',
  'Finalizing route…',
];
const LOADING_MSGS_AR = [
  'جارٍ تحديد إحداثيات العناوين…',
  'جارٍ بناء مصفوفة المسافات…',
  'جارٍ تشغيل خوارزمية التحسين…',
  'جارٍ اعتماد المسار…',
];

// ── AI Example data pool ──────────────────────────────────────────────────────
const AI_EXAMPLES = [
  {
    country: 'AE', city: 'Dubai',
    depot_address: 'Al Quoz Industrial Area 1, Dubai, UAE',
    stops: [
      { address: 'Dubai Mall, Downtown Dubai, UAE',                     weight: '22', volume: '0.9', service_time: '10' },
      { address: 'Jumeirah Beach Residence, Dubai Marina, UAE',         weight: '16', volume: '0.6', service_time: '8'  },
      { address: 'Deira City Centre, Deira, Dubai, UAE',                weight: '20', volume: '0.8', service_time: '12' },
      { address: 'Mall of the Emirates, Al Barsha, Dubai, UAE',         weight: '18', volume: '0.7', service_time: '10' },
      { address: 'Ibn Battuta Mall, Jebel Ali, Dubai, UAE',             weight: '14', volume: '0.5', service_time: '8'  },
      { address: 'Dragon Mart, International City, Dubai, UAE',         weight: '24', volume: '1.0', service_time: '15' },
      { address: 'Mirdif City Centre, Mirdif, Dubai, UAE',              weight: '12', volume: '0.5', service_time: '10' },
      { address: 'BurJuman Centre, Bur Dubai, UAE',                     weight: '10', volume: '0.4', service_time: '8'  },
    ],
    vehicles: [
      { vehicle_id: 'VAN-001', cap_weight: '40',  cap_volume: '3.0' },
      { vehicle_id: 'VAN-002', cap_weight: '40',  cap_volume: '3.0' },
      { vehicle_id: 'TRUCK-01',cap_weight: '80', cap_volume: '6.0' },
    ],
  },
  {
    country: 'SA', city: 'Riyadh',
    depot_address: 'Second Industrial City, Riyadh, Saudi Arabia',
    stops: [
      { address: 'Riyadh Park Mall, North Riyadh, Saudi Arabia',        weight: '24', volume: '0.9', service_time: '10' },
      { address: 'Kingdom Centre Tower, Al Olaya, Riyadh, Saudi Arabia',weight: '18', volume: '0.7', service_time: '8'  },
      { address: 'Al Nakheel Mall, Al Nakheel, Riyadh, Saudi Arabia',   weight: '16', volume: '0.6', service_time: '8'  },
      { address: 'Panorama Mall, Al Muhammadiyah, Riyadh, Saudi Arabia',weight: '20', volume: '0.8', service_time: '10' },
      { address: 'Al Andalus Mall, Riyadh, Saudi Arabia',               weight: '28', volume: '1.1', service_time: '12' },
      { address: 'Hayat Mall, Al Rabi, Riyadh, Saudi Arabia',           weight: '16', volume: '0.6', service_time: '8'  },
      { address: 'Riyadh Gallery Mall, Al Malqa, Riyadh, Saudi Arabia', weight: '18', volume: '0.7', service_time: '10' },
    ],
    vehicles: [
      { vehicle_id: 'VAN-A', cap_weight: '90',  cap_volume: '3.5' },
      { vehicle_id: 'VAN-B', cap_weight: '90',  cap_volume: '3.5' },
    ],
  },
  {
    country: 'QA', city: 'Doha',
    depot_address: 'Salwa Industrial Area, Doha, Qatar',
    stops: [
      { address: 'Villaggio Mall, Al Waab, Doha, Qatar',                weight: '20', volume: '0.8', service_time: '10' },
      { address: 'City Centre Doha, Al Muntazah, Doha, Qatar',          weight: '22', volume: '0.9', service_time: '10' },
      { address: 'Lagoona Mall, West Bay, Doha, Qatar',                 weight: '18', volume: '0.7', service_time: '8'  },
      { address: 'Landmark Mall, Old Airport Road, Doha, Qatar',        weight: '14', volume: '0.5', service_time: '7'  },
      { address: 'Ezdan Mall, Al Wakra, Qatar',                         weight: '24', volume: '1.0', service_time: '12' },
      { address: 'Place Vendôme, Lusail, Qatar',                        weight: '26', volume: '1.1', service_time: '12' },
      { address: 'Mall of Qatar, Al Rayyan, Qatar',                     weight: '30', volume: '1.2', service_time: '15' },
      { address: 'Hyatt Plaza, Al Luqta, Doha, Qatar',                  weight: '16', volume: '0.6', service_time: '8'  },
    ],
    vehicles: [
      { vehicle_id: 'QA-V1', cap_weight: '80',  cap_volume: '3.0' },
      { vehicle_id: 'QA-V2', cap_weight: '80',  cap_volume: '3.0' },
      { vehicle_id: 'QA-V3', cap_weight: '100', cap_volume: '4.0' },
    ],
  },
];

const pickRandomOptimizerExample = () => AI_EXAMPLES[Math.floor(Math.random() * AI_EXAMPLES.length)];

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
  const { t, lang } = useLanguage();
  const LOADING_MSGS = lang === 'ar' ? LOADING_MSGS_AR : LOADING_MSGS_EN;

  const [result,       setResult]       = useState<RouteOptimizerResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingMsg,   setLoadingMsg]   = useState(0);
  const [loadingPct,   setLoadingPct]   = useState(0);
  const [activeTab,    setActiveTab]    = useState<Tab>('summary');
  const [seqView,      setSeqView]      = useState<'timeline' | 'table'>('timeline');
  const [hoveredStop,  setHoveredStop]  = useState<number | null>(null);
  const [routeLines,   setRouteLines]   = useState<[number, number][][]>([]);
  const [mobileView,   setMobileView]   = useState<'form' | 'results'>('form');
  const loadingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const canUseOptimizer = !usage || usage.routeOptimizerCount < usage.routeOptimizerLimit;

  // map picker state: null = closed, 'depot' = depot, number = stop index
  const [mapPickerTarget, setMapPickerTarget] = useState<'depot' | number | null>(null);

  const { register, control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      depot_address: '',
      stops: [
        { address: '', weight: '', volume: '', service_time: '' },
      ],
      vehicles: [{ vehicle_id: '', cap_weight: '', cap_volume: '' }],
      country: 'AE', city: '', objective: 'distance',
    },
  });

  const { fields: stopFields, append: addStop, remove: removeStop, replace: replaceStops } = useFieldArray({ control, name: 'stops' });
  const { fields: vehFields,  append: addVeh,  remove: removeVeh,  replace: replaceVehs  } = useFieldArray({ control, name: 'vehicles' });

  const ROUTE_TOUR_KEY = 'route_optimizer_tour_seen';
  const routeTourFirstResult = useRef(true);
  const routeTour = useTabTour(ROUTE_TOUR_KEY);

  useEffect(() => {
    if (result && !loading && routeTourFirstResult.current) {
      routeTourFirstResult.current = false;
      if (!routeTour.hasSeenTour()) {
        setTimeout(() => routeTour.startTour(), 600);
      }
    }
    if (!result) routeTourFirstResult.current = true;
  }, [result, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillExample = () => {
    const ex = pickRandomOptimizerExample();
    setValue('depot_address', ex.depot_address, { shouldDirty: true });
    setValue('country',       ex.country,       { shouldDirty: true });
    setValue('city',          ex.city,          { shouldDirty: true });
    setValue('objective',     'distance',       { shouldDirty: true });
    replaceStops(ex.stops);
    replaceVehs(ex.vehicles);
  };

  // ── Map picker confirm ──────────────────────────────────────────────────────
  const handleMapConfirm = useCallback((loc: PickedLocation) => {
    if (mapPickerTarget === 'depot') {
      setValue('depot_address', loc.address, { shouldDirty: true });
    } else if (typeof mapPickerTarget === 'number') {
      setValue(`stops.${mapPickerTarget}.address`, loc.address, { shouldDirty: true });
    }
    setMapPickerTarget(null);
  }, [mapPickerTarget, setValue]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    if (!canUseOptimizer) { toast({ type: 'error', title: t('route.title'), message: t('route.limitReached') }); return; }
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

      const payload: import('../../types').RouteOptimizerRequest = {
        country:                data.country,
        city:                   data.city,
        optimization_objective: data.objective,
        depot: {
          address: data.depot_address,
        },
        stops: data.stops.map(s => ({
          address:       s.address,
          demand_weight: parseFloat(s.weight)       || 0,
          demand_volume: parseFloat(s.volume)       || 0,
          service_time:  parseFloat(s.service_time) || 0,
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

      // API returned a failure response — show in summary tab, not as toast
      if (!res.success || res.optimization_method === 'failed') return;

      toast({ type: 'success', title: 'Route optimized!', message: `${res.num_stops_assigned} stops assigned across ${res.num_vehicles_used} vehicle(s).` });

      // Pre-fetch OSRM road geometry for every vehicle route
      if (res.routes?.length) {
        Promise.all(
          res.routes.map(async (route) => {
            const depotLoc = route.vehicle_info?.start_location;
            if (!depotLoc || !route.stops.length) return [];
            const coords: [number, number][] = [
              [depotLoc.lat, depotLoc.lng],
              ...route.stops.map(s => [s.lat, s.lng] as [number, number]),
              [depotLoc.lat, depotLoc.lng],
            ];
            return getRoadRoute(coords);
          })
        ).then(lines => setRouteLines(lines));
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
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>{t('route.title')}</h2>
        {usage && (
          <p style={{ fontSize: '12px', color: usage.routeOptimizerCount >= usage.routeOptimizerLimit ? '#EF4444' : 'rgba(255,255,255,0.4)', margin: 0 }}>
            <span style={{ fontWeight: 700, color: usage.routeOptimizerCount >= usage.routeOptimizerLimit ? '#EF4444' : '#F5C842' }}>{usage.routeOptimizerCount}</span>
            {' / '}{usage.routeOptimizerLimit} {t('route.requestsUsed')}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* AI Example button */}
        <div style={{ marginBottom: '14px' }}>
          <button
            type="button"
            onClick={fillExample}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
              justifyContent: 'center',
              background: 'rgba(245,200,66,0.08)',
              border: '1px solid rgba(245,200,66,0.3)',
              borderRadius: '9px', padding: '9px 14px',
              cursor: 'pointer', color: '#F5C842',
              fontSize: '13px', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,200,66,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,200,66,0.08)'; }}
          >
            <Icon icon="solar:magic-stick-3-bold-duotone" width={15} />
            Use AI Example
          </button>
        </div>

        {/* DEPOT */}
        <Section icon="solar:home-2-bold-duotone" title={t('route.depotTitle')} color="#F5C842">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ ...lbl, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {t('route.depotAddress')}
                  <Tooltip text="Required — depot address must be filled" position="top">
                    <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#EF4444', cursor: 'help', flexShrink: 0 }}>!</span>
                  </Tooltip>
                </label>
                <button type="button" onClick={() => setMapPickerTarget('depot')}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', color: '#F5C842', fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,200,66,0.08)')}>
                  <Icon icon="solar:map-point-bold-duotone" width={12} />
                  {t('route.pickOnMap')}
                </button>
              </div>
              <input style={fld} placeholder="e.g. Al Quoz Industrial Area, Dubai" {...register('depot_address', { required: true })}
                onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '8px 0 0', lineHeight: 1.5 }}>The API geocodes the address automatically — no coordinates needed.</p>
        </Section>

        {/* STOPS */}
        <Section icon="solar:map-point-wave-bold-duotone" title={t('route.stops')} badge={`${stopFields.length} ${t('route.stop').toLowerCase()}s`} color="#10B981">
          {stopFields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>{t('route.stop')} {i + 1}</span>
                {stopFields.length > 1 && (
                  <button type="button" onClick={() => removeStop(i)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#EF4444', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ ...lbl, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {t('route.deliveryAddress')}
                    <Tooltip text="Required — each stop needs a delivery address" position="top">
                      <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#EF4444', cursor: 'help', flexShrink: 0 }}>!</span>
                    </Tooltip>
                  </label>
                  <button type="button" onClick={() => setMapPickerTarget(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', color: '#10B981', fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}>
                    <Icon icon="solar:map-point-bold-duotone" width={12} />
                    {t('route.pickOnMap')}
                  </button>
                </div>
                <input style={fld} placeholder="e.g. Dubai Mall, Downtown Dubai" {...register(`stops.${i}.address`, { required: true })}
                  onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.28)', borderRadius: '8px', padding: '10px 10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                  <Icon icon="solar:widget-add-bold-duotone" width={12} color="rgba(255,255,255,0.45)" />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Optional Details</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '6px' }}>
                  <StopField label={t('route.weight')} unit="kg" icon="solar:scale-bold-duotone" color="#F5C842"
                    tooltip="Package weight in kg — used to ensure the vehicle doesn't exceed its weight limit"
                    input={<input style={fld} placeholder="e.g. 15" type="number" step="any" {...register(`stops.${i}.weight`)}
                      onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                  />
                  <StopField label={t('route.volume')} unit="m³" icon="solar:box-bold-duotone" color="#A855F7"
                    tooltip="Package volume in cubic metres — used to ensure the vehicle doesn't exceed its cargo space"
                    input={<input style={fld} placeholder="e.g. 1.2" type="number" step="any" {...register(`stops.${i}.volume`)}
                      onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                  />
                  <StopField label={t('route.service')} unit="min" icon="solar:clock-circle-bold-duotone" color="#3B82F6"
                    tooltip="Time needed at this location for unloading, signature, or other tasks (in minutes)"
                    input={<input style={fld} placeholder="e.g. 10" type="number" step="any" {...register(`stops.${i}.service_time`)}
                      onFocus={e => (e.target.style.borderColor = '#10B981')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                  />
                </div>
              </div>
            </motion.div>
          ))}
          <OutlineButton size="sm" type="button"
            onClick={() => addStop({ address: '', weight: '', volume: '', service_time: '' })}>
            <Icon icon="solar:add-circle-bold" width={14} />{t('route.addStop')}
          </OutlineButton>
        </Section>

        {/* VEHICLES */}
        <Section icon="solar:bus-bold-duotone" title={t('route.fleet')} badge={`${vehFields.length} ${t('route.vehicle').toLowerCase()}${vehFields.length > 1 ? 's' : ''}`} color="#3B82F6">
          {vehFields.map((field, i) => (
            <motion.div key={field.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>{t('route.vehicle')} {i + 1}</span>
                {vehFields.length > 1 && (
                  <button type="button" onClick={() => removeVeh(i)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#EF4444', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {t('route.vehicleId')}
                  <Tooltip text="Required — give each vehicle a unique name or ID" position="top">
                    <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#EF4444', cursor: 'help', flexShrink: 0 }}>!</span>
                  </Tooltip>
                </label>
                <input style={fld} placeholder="e.g. Truck-01 or Van-A" {...register(`vehicles.${i}.vehicle_id`)}
                  onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.28)', borderRadius: '8px', padding: '10px 10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                  <Icon icon="solar:widget-add-bold-duotone" width={12} color="rgba(255,255,255,0.45)" />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Optional Details</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <StopField label={t('route.weightCap')} unit="kg" icon="solar:scale-bold-duotone" color="#F5C842"
                    tooltip="Maximum weight this vehicle can carry — used to balance load across vehicles"
                    input={<input style={fld} placeholder="e.g. 1000" type="number" step="any" {...register(`vehicles.${i}.cap_weight`)}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                  />
                  <StopField label={t('route.volumeCap')} unit="m³" icon="solar:box-bold-duotone" color="#A855F7"
                    tooltip="Maximum cargo volume this vehicle can carry — used to balance load across vehicles"
                    input={<input style={fld} placeholder="e.g. 50" type="number" step="any" {...register(`vehicles.${i}.cap_volume`)}
                      onFocus={e => (e.target.style.borderColor = '#3B82F6')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />}
                  />
                </div>
              </div>
            </motion.div>
          ))}
          <OutlineButton size="sm" type="button"
            onClick={() => addVeh({ vehicle_id: '', cap_weight: '', cap_volume: '' })}>
            <Icon icon="solar:add-circle-bold" width={14} />{t('route.addVehicle')}
          </OutlineButton>
        </Section>

        {/* SETTINGS */}
        <Section icon="solar:settings-bold-duotone" title={t('route.settings')} color="#94A3B8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <CountryDropdown
                  label={t('dash.addressNormalizer').split(' ')[0]}
                  value={field.value}
                  onChange={field.onChange}
                  compact
                />
              )}
            />
            <div>
              <label style={lbl}>{t('route.city')}</label>
              <input style={fld} placeholder="e.g. Dubai" {...register('city')}
                onFocus={e => (e.target.style.borderColor = '#F5C842')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
            </div>
            <div>
              <label style={lbl}>Optimization Objective</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                {([
                  { value: 'distance', icon: 'solar:routing-2-bold-duotone', label: 'Distance' },
                  { value: 'time',     icon: 'solar:clock-circle-bold-duotone', label: 'Time' },
                ] as const).map(({ value, icon, label }) => (
                  <label key={value} style={{ flex: 1, cursor: 'pointer' }}>
                    <input type="radio" value={value} {...register('objective')} style={{ display: 'none' }} />
                    <Controller
                      name="objective"
                      control={control}
                      render={({ field }) => (
                        <div
                          onClick={() => field.onChange(value)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                            background: field.value === value ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${field.value === value ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: field.value === value ? '#F5C842' : 'rgba(255,255,255,0.5)',
                            fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                          }}>
                          <Icon icon={icon} width={14} />
                          {label}
                        </div>
                      )}
                    />
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
                Distance minimises total km travelled · Time minimises total travel time
              </p>
            </div>
          </div>
        </Section>

        <div style={{ padding: '8px 0 16px' }}>
          <GoldButton type="submit" fullWidth size="lg" loading={loading} disabled={!canUseOptimizer}>
            {!loading && <Icon icon="solar:routing-2-bold-duotone" width={17} />}
            {loading ? `${t('route.optimizing')} ${Math.round(loadingPct)}%` : t('route.optimizeBtn')}
          </GoldButton>
          {!canUseOptimizer && <p style={{ textAlign: 'center', fontSize: '12px', color: '#EF4444', marginTop: '8px' }}>{t('route.limitReached')}</p>}
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
            title={t('route.readyTitle')}
            description={t('route.readyDesc')}
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
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{t('route.loadingTime')}</p>
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
                { key: 'summary',   icon: 'solar:chart-square-bold-duotone',   labelKey: 'route.summary' },
                { key: 'map',       icon: 'solar:map-point-wave-bold-duotone', labelKey: 'route.mapTab' },
                { key: 'sequence',  icon: 'solar:list-bold-duotone',           labelKey: 'route.sequence' },
                { key: 'analytics', icon: 'solar:graph-up-bold-duotone',       labelKey: 'route.analytics' },
              ] as { key: Tab; icon: string; labelKey: 'route.summary' | 'route.mapTab' | 'route.sequence' | 'route.analytics' }[]).map(tab => (
                <button key={tab.key} id={`tour-route-${tab.key}`} onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: isTablet ? '8px 10px' : '8px 14px',
                    flexShrink: 0,
                    background: activeTab === tab.key ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activeTab === tab.key ? 'rgba(245,200,66,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    fontSize: isTablet ? '12px' : '13px', fontWeight: 600,
                    color: activeTab === tab.key ? '#F5C842' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}>
                  <Icon icon={tab.icon} width={16} />
                  <span>{t(tab.labelKey)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: isMobile ? '16px' : '20px' }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === 'summary'   && <SummaryTab result={result} formatTime={formatTime} sequentialDistKm={0} />}
                {activeTab === 'map'       && <MapTab result={result} routeLines={routeLines} hoveredStop={hoveredStop} setHoveredStop={setHoveredStop} />}
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
      // Match the exact padding <main> applies so there's no gap/overshoot
      margin: isMobile ? '-20px -14px' : '-24px',
      overflow: isMobile ? 'visible' : 'hidden',
    }}>
      {/* Mobile sticky header — Configure/Results toggle + result tabs in one block */}
      {isMobile && (
        <div style={{
          background: 'rgba(10,14,39,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: -20, zIndex: 50, flexShrink: 0,
        }}>
          {/* Row 1: Configure / Results toggle */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 8px' }}>
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
                {v === 'form' ? t('route.configure') : t('route.results')}
                {v === 'results' && (result || loading) && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: loading ? '#F5C842' : '#10B981', display: 'inline-block' }} />
                )}
              </button>
            ))}
          </div>
          {/* Row 2: Result tabs — only when viewing results and result exists */}
          {mobileView === 'results' && result && !loading && (
            <div style={{ display: 'flex', gap: '4px', padding: '0 16px 10px' }}>
              {([
                { key: 'summary',   icon: 'solar:chart-square-bold-duotone',   labelKey: 'route.summary' },
                { key: 'map',       icon: 'solar:map-point-wave-bold-duotone', labelKey: 'route.mapTab' },
                { key: 'sequence',  icon: 'solar:list-bold-duotone',           labelKey: 'route.sequence' },
                { key: 'analytics', icon: 'solar:graph-up-bold-duotone',       labelKey: 'route.analytics' },
              ] as { key: Tab; icon: string; labelKey: 'route.summary' | 'route.mapTab' | 'route.sequence' | 'route.analytics' }[]).map(tab => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    padding: '7px 4px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600, border: '1px solid', whiteSpace: 'nowrap',
                    borderColor: activeTab === tab.key ? 'rgba(245,200,66,0.4)' : 'rgba(255,255,255,0.08)',
                    background: activeTab === tab.key ? 'rgba(245,200,66,0.1)' : 'rgba(255,255,255,0.03)',
                    color: activeTab === tab.key ? '#F5C842' : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.2s',
                  }}>
                  <Icon icon={tab.icon} width={13} />
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(!isMobile || mobileView === 'form') && LeftPanel}
      {(!isMobile || mobileView === 'results') && RightPanel}

      {/* ── Map Picker Dialog ─────────────────────────────────────────── */}
      <AnimatePresence>
        {mapPickerTarget !== null && (
          <MapPickerDialog
            open={mapPickerTarget !== null}
            onClose={() => setMapPickerTarget(null)}
            onConfirm={handleMapConfirm}
            lang={lang}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* ── First-time walkthrough ── */}
      <TabTour
        run={routeTour.run}
        onClose={routeTour.endTour}
        steps={[
          {
            target: '#tour-route-summary',
            title: 'Summary Tab',
            description: 'See a quick overview of the optimized routes — total distance, time, number of stops served, and efficiency vs. the naive approach.',
          },
          {
            target: '#tour-route-map',
            title: 'Map Tab',
            description: 'Visualize all vehicle routes on an interactive map. Each vehicle gets its own color. Click stops for details.',
          },
          {
            target: '#tour-route-sequence',
            title: 'Sequence Tab',
            description: 'Review the exact delivery order for each vehicle — stop names, arrival times, and load — in a timeline or table view.',
          },
          {
            target: '#tour-route-analytics',
            title: 'Analytics Tab',
            description: 'Dive into charts showing distance and time per vehicle, utilization rates, and cost savings compared to unoptimized delivery.',
          },
        ]}
      />
    </div>
  );
};

// ── Stop field with micro label ───────────────────────────────────────────────
const StopField: React.FC<{ label: string; unit: string; icon: string; color: string; input: React.ReactNode; tooltip: string }> = ({ label, unit, icon, color, input, tooltip }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
      <Tooltip text={tooltip} position="top">
        <Icon icon={icon} width={11} color={color}  />
      </Tooltip>
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


// ── Summary Tab ───────────────────────────────────────────────────────────────
const SummaryTab: React.FC<{
  result: RouteOptimizerResponse;
  formatTime: (m: number) => string;
  sequentialDistKm: number;
}> = ({ result, formatTime, sequentialDistKm }) => {
  const { isMobile } = useBreakpoint();
  const { lang } = useLanguage();

  // ── Failed response — show error card and nothing else ────────────────────
  if (!result.success || result.optimization_method === 'failed') {
    const reason = result.error ?? 'Optimization failed — please check your inputs and try again.';
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(10,14,39,0.9) 60%)',
        border: '1px solid rgba(239,68,68,0.35)', borderRadius: '14px', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon icon="solar:danger-triangle-bold-duotone" width={22} color="#EF4444" />
          </div>
          <div>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              {lang === 'ar' ? 'فشل التحسين' : 'Optimization Failed'}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
              {lang === 'ar' ? 'تعذّر على المحرك إيجاد مسار صالح' : 'The engine could not produce a valid route'}
            </p>
          </div>
        </div>

        <div style={{ width: '100%', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {lang === 'ar' ? 'سبب الخطأ' : 'Reason'}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6 }}>{reason}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px 16px', width: '100%' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {lang === 'ar' ? 'اقتراحات' : 'Suggestions'}
          </p>
          {[
            lang === 'ar' ? 'زيادة سعة وزن المركبة أو حجمها' : 'Increase vehicle weight or volume capacity',
            lang === 'ar' ? 'إضافة مركبة إضافية' : 'Add another vehicle to the fleet',
            lang === 'ar' ? 'تقليل الطلب الكلي للمحطات' : 'Reduce total stop demand (weight / volume)',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: i < 2 ? '6px' : 0 }}>
              <Icon icon="solar:arrow-right-bold" width={12} color="rgba(255,255,255,0.3)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
    { icon: 'solar:routing-2-bold-duotone',      label: lang === 'ar' ? 'إجمالي المسافة' : 'Total Distance',   value: `${result.total_distance_km?.toFixed(2)} km`, color: '#F5C842', tooltip: 'Total road distance the vehicle will travel across all stops' },
    { icon: 'solar:clock-circle-bold-duotone',   label: lang === 'ar' ? 'الوقت الكلي' : 'Total Time',          value: formatTime(result.total_time_minutes),          color: '#3B82F6', tooltip: 'Total estimated time including driving and service time at each stop' },
    { icon: 'solar:map-point-wave-bold-duotone', label: lang === 'ar' ? 'المحطات المُسنَّدة' : 'Stops Assigned', value: `${result.num_stops_assigned} / ${totalStops}`, color: '#10B981', tooltip: 'Number of stops successfully assigned to vehicles out of total stops entered' },
    { icon: 'solar:delivery-bold-duotone',       label: lang === 'ar' ? 'سرعة التوصيل' : 'Delivery Speed',     value: `${deliveryRate}/hr`,                            color: '#A855F7', tooltip: 'Average number of deliveries completed per hour on this route' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Top stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'rgba(12,17,45,0.8)', border: `1px solid ${s.color}25`, borderRadius: '12px', padding: '16px' }}>
            <Tooltip text={s.tooltip} position="top">
              <Icon icon={s.icon} width={20} color={s.color}  />
            </Tooltip>
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
            tooltip="Kilometres saved compared to visiting stops in the order you entered them"
          />
          <ImpactMetric
            icon="solar:clock-circle-bold-duotone" color="#3B82F6"
            value={hasBaseline ? formatTime(savedMin) : '—'}
            label="Time Saved"
            sub={hasBaseline ? `vs input order` : 'no baseline'}
            tooltip="Time saved by using the optimized order instead of your original stop sequence"
          />
          <ImpactMetric
            icon="solar:target-bold-duotone" color="#10B981"
            value={`${avgKmPerStop} km`}
            label="Avg per Stop"
            sub={`${avgMinPerStop} min/stop`}
            tooltip="Average distance and time spent per delivery stop on this route"
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
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>{lang === 'ar' ? 'أداء الأسطول' : 'Fleet Performance'}</p>
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
                  <MiniStat icon="solar:clock-circle-bold-duotone" color="#3B82F6" value={formatTime(driveMin)} label="Drive time" tooltip="Time spent driving between stops, excluding service time at each location" />
                  <MiniStat icon="solar:stopwatch-bold-duotone" color="#A855F7" value={formatTime(totalSvcMin)} label="Service time" tooltip="Total time spent at delivery locations (loading, unloading, signatures, etc.)" />
                  <MiniStat icon="solar:map-point-wave-bold-duotone" color="#10B981" value={`${stops}`} label="Deliveries" tooltip="Total number of delivery stops assigned to this vehicle" />
                </div>

                {/* Load bars */}
                <CapBar label="Weight Load" used={route.load_weight} cap={route.capacity_weight} color="#F5C842" unit="kg" tooltip="Total package weight loaded on this vehicle vs its maximum weight capacity" />
                <CapBar label="Volume Load" used={route.load_volume} cap={route.capacity_volume} color="#3B82F6" unit="m³" tooltip="Total cargo volume loaded on this vehicle vs its maximum volume capacity" />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

// ── Small helpers for SummaryTab ──────────────────────────────────────────────
const ImpactMetric: React.FC<{ icon: string; color: string; value: string; label: string; sub: string; tooltip: string }> = ({ icon, color, value, label, sub, tooltip }) => (
  <div style={{ background: 'rgba(10,14,39,0.6)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
    <Tooltip text={tooltip} position="top">
      <Icon icon={icon} width={16} color={color}  />
    </Tooltip>
    <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: 800, color, margin: '6px 0 1px' }}>{value}</p>
    <p style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', margin: '0 0 1px' }}>{label}</p>
    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{sub}</p>
  </div>
);

const MiniStat: React.FC<{ icon: string; color: string; value: string; label: string; tooltip: string }> = ({ icon, color, value, label, tooltip }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
    <Tooltip text={tooltip} position="top">
      <Icon icon={icon} width={14} color={color}  />
    </Tooltip>
    <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 800, color, margin: '4px 0 2px' }}>{value}</p>
    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
  </div>
);

const CapBar: React.FC<{ label: string; used: number; cap: number; color: string; unit: string; tooltip: string }> = ({ label, used, cap, color, unit, tooltip }) => {
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Tooltip text={tooltip} position="top">
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', cursor: 'help' }}>{label}</span>
        </Tooltip>
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
  result: RouteOptimizerResponse; routeLines: [number, number][][];
  hoveredStop: number | null; setHoveredStop: (n: number | null) => void;
}> = ({ result, routeLines, hoveredStop, setHoveredStop }) => {
  const { isMobile, isTablet } = useBreakpoint();

  const depot = result.routes?.[0]?.vehicle_info?.start_location;

  const allPositions = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (depot) pts.push([depot.lat, depot.lng]);
    result.routes.forEach(r => r.stops.forEach(s => pts.push([s.lat, s.lng])));
    return pts;
  }, [depot, result.routes]);

  if (!result.routes?.length) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>No route data available.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Vehicle legend */}
      {result.routes.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {result.routes.map((route, vi) => {
            const color = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
            return (
              <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}40`, borderRadius: '8px', padding: '5px 10px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>{route.vehicle_id}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>· {route.stops.length} stops</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        height: isMobile ? '55vw' : isTablet ? '420px' : 'calc(100vh - 240px)',
        minHeight: isMobile ? '280px' : '380px',
        borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(245,200,66,0.15)', position: 'relative',
      }}>
        <MapContainer center={[25.2, 55.27]} zoom={11} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution="" />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" attribution="" />

          {/* One polyline per vehicle */}
          {result.routes.map((route, vi) => {
            const color = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
            const line = routeLines[vi];
            const hasLine = line && line.length > 1;

            const fallbackPts: [number, number][] = depot
              ? [[depot.lat, depot.lng], ...route.stops.map(s => [s.lat, s.lng] as [number, number]), [depot.lat, depot.lng]]
              : route.stops.map(s => [s.lat, s.lng] as [number, number]);

            return (
              <React.Fragment key={vi}>
                {hasLine ? (
                  <>
                    <Polyline positions={line} color={color} weight={10} opacity={0.15} />
                    <Polyline positions={line} color={color} weight={4}  opacity={0.9} />
                  </>
                ) : (
                  fallbackPts.length > 1 && <Polyline positions={fallbackPts} color={color} weight={3} dashArray="8 6" opacity={0.6} />
                )}
              </React.Fragment>
            );
          })}

          {/* Depot marker */}
          {depot && (
            <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#F5C842' }}>Depot</p>
                  <p style={{ margin: 0, fontSize: 12 }}>{depot.address}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{depot.lat.toFixed(5)}, {depot.lng.toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Stop markers — one per vehicle in its colour */}
          {result.routes.map((route, vi) => {
            const color = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
            return route.stops.map((stop, si) => {
              const key = `${vi}-${si}`;
              const hovered = hoveredStop === vi * 1000 + si;
              return (
                <Marker key={key} position={[stop.lat, stop.lng]}
                  icon={hovered ? makeHoverIcon(stop.sequence, color) : makeStopIcon(stop.sequence, color)}
                  eventHandlers={{
                    mouseover: () => setHoveredStop(vi * 1000 + si),
                    mouseout:  () => setHoveredStop(null),
                  }}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <p style={{ fontWeight: 700, margin: '0 0 2px', color }}>
                        {route.vehicle_id} — Stop {stop.sequence}
                      </p>
                      <p style={{ margin: '0 0 4px', fontSize: 12 }}>{stop.address}</p>
                      {stop.arrival_time_minutes != null && <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>⏱ Arrival: {stop.arrival_time_minutes} min</p>}
                      {stop.demand_weight > 0 && <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>⚖️ {stop.demand_weight} kg · 📦 {stop.demand_volume} m³</p>}
                      {stop.service_time_minutes > 0 && <p style={{ margin: 0, fontSize: 11, color: '#888' }}>🔧 Service: {stop.service_time_minutes} min</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            });
          })}

          <FitBounds positions={allPositions} />
        </MapContainer>
      </div>
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
}> = ({ result, view, setView, hoveredStop, setHoveredStop }) => {
  const { lang } = useLanguage();
  const [selectedVehicle, setSelectedVehicle] = useState(0);

  const route = result.routes?.[selectedVehicle] as VehicleRoute | undefined;
  const vehicleColor = VEHICLE_COLORS[selectedVehicle % VEHICLE_COLORS.length];

  if (!route) return null;

  return (
    <div>
      {/* Vehicle selector — shown only if more than one vehicle */}
      {result.routes.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {result.routes.map((r, vi) => {
            const col = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
            return (
              <button key={vi} onClick={() => setSelectedVehicle(vi)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${selectedVehicle === vi ? col : 'rgba(255,255,255,0.1)'}`,
                  background: selectedVehicle === vi ? `${col}18` : 'rgba(255,255,255,0.03)',
                  color: selectedVehicle === vi ? col : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                {r.vehicle_id}
                <span style={{ opacity: 0.6 }}>({r.stops.length})</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {(['timeline', 'table'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(245,200,66,0.25)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: view === v ? 'rgba(245,200,66,0.12)' : 'transparent', color: view === v ? '#F5C842' : 'rgba(255,255,255,0.5)' }}>
            {v === 'timeline' ? (lang === 'ar' ? 'الجدول الزمني' : 'Timeline') : (lang === 'ar' ? 'الجدول' : 'Table')}
          </button>
        ))}
      </div>

      {view === 'timeline' && (
        <div style={{ padding: '8px 4px' }}>
          <RoadNode
            label={lang === 'ar' ? 'بداية' : 'START'} isDepot color="#F5C842"
            address={lang === 'ar' ? 'المستودع — نقطة الانطلاق' : 'Depot — Starting Point'}
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
                <RoadConnector fromSide={i === 0 ? 'left' : (i % 2 === 0 ? 'right' : 'left')} toSide={side} isFirst={i === 0} />
                <RoadNode
                  label={String(stop.sequence)}
                  isDepot={false}
                  color={hoveredStop === i ? vehicleColor : '#FFFFFF'}
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
                {!isLast && nextSide !== side && <RoadTurn fromSide={side} />}
              </React.Fragment>
            );
          })}

          <RoadConnector fromSide={route.stops.length % 2 === 0 ? 'right' : 'left'} toSide="left" isFirst={false} />
          <RoadNode
            label={lang === 'ar' ? 'نهاية' : 'END'} isDepot color="#10B981"
            address={lang === 'ar' ? 'المستودع — اكتملت الجولة' : 'Depot — Route Complete'}
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
                {(lang === 'ar'
                  ? ['#', 'العنوان', 'الوصول', 'الوزن', 'الحجم', 'الخدمة']
                  : ['#', 'Address', 'Arrival', 'Weight', 'Volume', 'Service']
                ).map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {route.stops.map((s, i) => (
                <tr key={i} onMouseEnter={() => setHoveredStop(i)} onMouseLeave={() => setHoveredStop(null)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: hoveredStop === i ? `${vehicleColor}12` : 'transparent', transition: 'background 0.15s', cursor: 'default' }}>
                  <td style={{ padding: '10px 12px', color: vehicleColor, fontWeight: 800 }}>{s.sequence}</td>
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
  const { lang } = useLanguage();
  const [selectedVehicle, setSelectedVehicle] = useState(0);

  const route = result.routes?.[selectedVehicle] as VehicleRoute | undefined;
  const vehicleColor = VEHICLE_COLORS[selectedVehicle % VEHICLE_COLORS.length];

  if (!route) return null;

  const arrivalData = route.stops.map(s => ({ stop: `#${s.sequence}`, arrival: s.arrival_time_minutes ?? 0 }));
  const demandData  = route.stops.map(s => ({ stop: `#${s.sequence}`, weight: s.demand_weight ?? 0, volume: (s.demand_volume ?? 0) * 10 }));

  const weightPct = route.capacity_weight > 0 ? (route.load_weight / route.capacity_weight) * 100 : 0;
  const volPct    = route.capacity_volume  > 0 ? (route.load_volume  / route.capacity_volume)  * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Vehicle selector */}
      {result.routes.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {result.routes.map((r, vi) => {
            const col = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
            return (
              <button key={vi} onClick={() => setSelectedVehicle(vi)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${selectedVehicle === vi ? col : 'rgba(255,255,255,0.1)'}`,
                  background: selectedVehicle === vi ? `${col}18` : 'rgba(255,255,255,0.03)',
                  color: selectedVehicle === vi ? col : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s',
                }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                {r.vehicle_id}
                <span style={{ opacity: 0.6 }}>({r.stops.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Arrival Distribution */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: `1px solid ${vehicleColor}25`, borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: `3px solid ${vehicleColor}`, paddingLeft: '10px' }}>{lang === 'ar' ? 'توزيع وقت الوصول' : 'Arrival Time Distribution'}</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={arrivalData}>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="stop" tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} width={30} />
            <ChartTooltip contentStyle={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="arrival" name="Arrival (min)" fill={vehicleColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Demand per Stop */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px', borderLeft: '3px solid #3B82F6', paddingLeft: '10px' }}>{lang === 'ar' ? 'الطلب لكل محطة' : 'Demand per Stop'}</h4>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px 13px' }}>{lang === 'ar' ? 'الحجم مضروب ×10 للوضوح' : 'Volume scaled ×10 for visibility'}</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={demandData}>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="stop" tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} />
            <YAxis tick={{ ...chartAxisStyle }} axisLine={false} tickLine={false} width={30} />
            <ChartTooltip contentStyle={{ background: 'rgba(12,17,45,0.97)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="weight" name="Weight (kg)" fill={vehicleColor} radius={[3, 3, 0, 0]} />
            <Bar dataKey="volume" name="Volume ×10"  fill="#3B82F6"     radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Capacity Utilization */}
      <div style={{ background: 'rgba(12,17,45,0.8)', border: '1px solid rgba(245,200,66,0.15)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', borderLeft: '3px solid #10B981', paddingLeft: '10px' }}>{lang === 'ar' ? 'استغلال الطاقة الاستيعابية' : 'Capacity Utilization'}</h4>
        <CapBar label={lang === 'ar' ? 'استغلال الوزن' : 'Weight Utilization'} used={route.load_weight}  cap={route.capacity_weight} color="#F5C842" unit="kg" tooltip="How much of the vehicle's weight capacity is being used — higher means better efficiency" />
        <CapBar label={lang === 'ar' ? 'استغلال الحجم' : 'Volume Utilization'} used={route.load_volume}  cap={route.capacity_volume} color="#3B82F6" unit="m³" tooltip="How much of the vehicle's cargo space is being used — higher means better efficiency" />
        {(weightPct < 50 && volPct < 50) && (
          <p style={{ fontSize: '13px', color: '#10B981', marginTop: '8px' }}>✅ {lang === 'ar' ? 'ضمن الطاقة الاستيعابية' : 'Well within capacity'}</p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { label: lang === 'ar' ? 'متوسط وقت الخدمة' : 'Avg Service Time', value: route.stops.length > 0 ? `${(route.stops.reduce((a, s) => a + (s.service_time_minutes ?? 0), 0) / route.stops.length).toFixed(0)} min` : '—' },
          { label: lang === 'ar' ? 'إجمالي المحطات' : 'Total Stops',     value: route.stops.length.toString() },
          { label: lang === 'ar' ? 'الحمولة الكلية' : 'Total Load',      value: `${route.load_weight?.toFixed(1)} kg` },
          { label: lang === 'ar' ? 'الحجم الكلي' : 'Total Volume',    value: `${route.load_volume?.toFixed(1)} m³` },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${vehicleColor}20`, borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Sora', sans-serif", color: vehicleColor, margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
