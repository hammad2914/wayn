import L from 'leaflet';
import { TILES } from '../dispatch/shared';

/** A dark map with the app's tiles; the caller adds its own layers */
export const baseMap = (el: HTMLElement, opts: L.MapOptions = {}) => {
  const m = L.map(el, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, ...opts });
  L.tileLayer(`${TILES}Base/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19 }).addTo(m);
  L.tileLayer(`${TILES}Reference/MapServer/tile/{z}/{y}/{x}`, { maxNativeZoom: 16, maxZoom: 19, opacity: 0.5 }).addTo(m);
  return m;
};
export const divIcon = (html: string, size: number) => L.divIcon({ className: '', html, iconSize: [size, size] });

/** The road line through the points, from the public routing server; straight lines if it doesn't answer */
export async function roadLine(points: [number, number][]): Promise<[number, number][]> {
  if (points.length < 2) return points;
  try {
    const path = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=simplified&geometries=geojson`, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const coords = json.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (coords) return coords.map(([lng, lat]) => [lat, lng]);
  } catch { /* straight lines below */ }
  return points;
}

// The same groups the dispatch side uses (backend dispatch.service sortMatch)
const DISTRICT = new Set(['suburb', 'neighbourhood', 'quarter', 'city_district', 'district', 'borough']);
const CITY = new Set(['city', 'town', 'village', 'hamlet', 'municipality', 'county', 'state', 'country']);
const STREET = new Set(['road', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway', 'residential', 'unclassified',
  'service', 'living_street', 'pedestrian', 'building', 'house', 'apartments']);
export type Match = 'street' | 'landmark' | 'place' | 'district' | 'city';
export const matchOf = (accuracy?: string | null): Match =>
  !accuracy || CITY.has(accuracy) ? 'city' : accuracy === 'landmark' ? 'landmark'
    : DISTRICT.has(accuracy) ? 'district' : STREET.has(accuracy) ? 'street' : 'place';
export const matchTone = (m: Match) => (m === 'district' ? 'check' : m === 'city' ? 'warn' : 'ok');

export const COUNTRIES = [['SA', 'Saudi Arabia', 'السعودية'], ['AE', 'UAE', 'الإمارات'], ['KW', 'Kuwait', 'الكويت'],
  ['QA', 'Qatar', 'قطر'], ['BH', 'Bahrain', 'البحرين'], ['OM', 'Oman', 'عُمان']] as const;
/** The message from an API error, or a fallback */
export const errorOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
  || (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
