// OpenStreetMap geocoding through the public Nominatim server.
// Its usage policy allows at most one request per second with a real
// User-Agent, so every call goes through one queue and results are cached.

import { findDistrict, type DistrictMatch } from './district.service';

const NOMINATIM = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODER_USER_AGENT || 'Wayn/1.0 (address normalizer; contact via github.com/hammad2914)';
const MIN_GAP_MS = 1100;

export interface Place {
  osmType:     string;          // N / W / R
  osmId:       number;
  lat:         number;
  lng:         number;
  type:        string;          // Nominatim addresstype: building, road, suburb, city...
  names:       string[];        // every name it has: local, English, Arabic…
  importance:  number;
  displayName: string;
  address:     Record<string, string>;
}

const cache = new Map<string, Place[]>();
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

/** Run fn after the previous Nominatim call, at least MIN_GAP_MS apart */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function getJson(url: string, retry = true): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
    return res.json();
  } catch (err) {
    // one retry for dropped connections; the public server has the odd blip
    if (!retry) throw err;
    await new Promise(r => setTimeout(r, MIN_GAP_MS));
    return getJson(url, false);
  }
}

interface NominatimRow {
  osm_type: string; osm_id: number; lat: string; lon: string;
  addresstype?: string; type?: string; importance?: number;
  display_name: string; name?: string; namedetails?: Record<string, string> | null; address?: Record<string, string>;
}

const toPlace = (r: NominatimRow): Place => ({
  osmType:     r.osm_type.charAt(0).toUpperCase(),
  osmId:       r.osm_id,
  lat:         parseFloat(r.lat),
  lng:         parseFloat(r.lon),
  type:        r.addresstype || r.type || 'unknown',
  importance:  r.importance ?? 0,
  // its own names only, not brand / operator / old names
  names:       [r.name, r.namedetails?.name, r.namedetails?.['name:en'], r.namedetails?.['name:ar']].filter((n): n is string => !!n),
  displayName: r.display_name,
  address:     r.address ?? {},
});

/**
 * Best match for a free-text query, limited to one country when given.
 * addressOnly skips shops and landmarks, so "Olaya Street" finds the street
 * itself rather than a hotel on it.
 */
export async function search(
  query: string, country?: string, addressOnly = false,
  near?: { lat: number; lng: number },
): Promise<Place | null> {
  return (await searchMany(query, country, addressOnly, near, 1))[0] ?? null;
}

async function searchMany(
  query: string, country: string | undefined, addressOnly: boolean,
  near: { lat: number; lng: number } | undefined, limit: number,
): Promise<Place[]> {
  const key = `s|${country ?? ''}|${addressOnly}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ''}|${limit}|${query.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;

  const params = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', namedetails: '1', limit: String(limit), 'accept-language': 'en' });
  if (country) params.set('countrycodes', country.toLowerCase());
  if (addressOnly) params.set('layer', 'address');
  // keep matches within ~50 km of a known point (the route's city)
  if (near) {
    const d = 0.5;
    params.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','));
    params.set('bounded', '1');
  }
  const rows = await throttled(() => getJson(`${NOMINATIM}/search?${params}`)) as NominatimRow[];
  const places = rows.map(toPlace);
  cache.set(key, places);
  return places;
}

/** The same place again, with its address written in another language */
export async function lookup(place: Place, lang: 'en' | 'ar'): Promise<Place | null> {
  const key = `l|${lang}|${place.osmType}${place.osmId}`;
  if (cache.has(key)) return cache.get(key)![0] ?? null;

  const params = new URLSearchParams({ osm_ids: `${place.osmType}${place.osmId}`, format: 'jsonv2', addressdetails: '1', 'accept-language': lang });
  const rows = await throttled(() => getJson(`${NOMINATIM}/lookup?${params}`)) as NominatimRow[];
  const found = rows.map(toPlace);
  cache.set(key, found);
  return found[0] ?? null;
}

// kinds of result that describe a location rather than a business on it
const ADDRESS_TYPES = new Set([
  'road', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway', 'residential', 'house',
  'neighbourhood', 'suburb', 'quarter', 'city_district', 'district', 'village', 'town', 'city',
  'municipality', 'county', 'state', 'postcode',
]);

const words = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
    .map(w => w.replace(/^(al|el|ال)-?/, ''))
    .filter(w => w.length > 2);

/** Share of the place's name that the query mentions, 0 to 1 */
const nameScore = (place: Place, query: string) => {
  // the last part is usually the city, which every place in town shares
  const parts = query.split(',');
  const q = new Set(words(parts.length > 1 ? parts.slice(0, -1).join(' ') : query));
  return Math.max(0, ...place.names.map(name => {
    const n = words(name);
    return n.length ? n.filter(w => q.has(w)).length / n.length : 0;
  }));
};

// "Hyatt Regency Riyadh Olaya" shares half its words with "Olaya Street, Riyadh" but is not what was asked
const asksFor = (place: Place, query: string) => nameScore(place, query) > 0.6;

/** Split an address into the queries worth trying, most specific first */
export function candidates(address: string, max = 4): string[] {
  const parts = address.split(',').map(p => p.trim()).filter(p => p && !COUNTRY_NAMES.test(p));
  if (parts.length <= 1) return parts;
  const last = parts[parts.length - 1];
  const out = [parts.join(', ')];
  // "Kingdom Centre Tower, Al Olaya, Riyadh" → also "Kingdom Centre Tower, Riyadh"
  if (parts.length > 2) out.push(`${parts[0]}, ${last}`);
  for (let i = 1; i < parts.length - 1; i++) out.push(parts.slice(i).join(', '));
  // the city alone, last of all, so there's always an approximate answer
  return [...new Set([...out.slice(0, max - 1), last])];
}

const COUNTRY_NAMES = /^(saudi arabia|ksa|uae|united arab emirates|qatar|kuwait|bahrain|oman|egypt|jordan|lebanon|المملكة العربية السعودية|السعودية|الإمارات|الإمارات العربية المتحدة|قطر|الكويت|البحرين|عمان|عُمان|مصر|الأردن|لبنان)$/i;


/** A district from the saved list, with its full address fetched by its OpenStreetMap id */
const REGION_KEYS = new Set(['postcode', 'county', 'state', 'country', 'country_code']);

async function districtPlace({ district: d, city, cityAr }: DistrictMatch): Promise<Place> {
  const names = [d.n, d.en, d.ar].filter((n): n is string => !!n);
  const base: Place = {
    osmType: d.osm.charAt(0), osmId: Number(d.osm.slice(1)), lat: d.lat, lng: d.lng, type: 'suburb',
    names, importance: 0.2, displayName: `${d.en ?? d.n}, ${city}`, address: { suburb: d.en ?? d.n, city },
  };
  // OpenStreetMap search does not index these district boundaries, so /lookup finds nothing.
  // The address at the district's centre gives the region and postcode in each language (its
  // street and city are not used: the street is just whichever is nearest, and the "city" is
  // sometimes a municipality). Saved under the lookup keys, so the Arabic version is found later.
  const local = { en: d.en ?? d.n, ar: d.ar ?? d.n }, cities = { en: city, ar: cityAr };
  let english = base;
  for (const lang of ['en', 'ar'] as const) {
    const params = new URLSearchParams({ lat: String(d.lat), lon: String(d.lng), zoom: '16', format: 'jsonv2', addressdetails: '1', 'accept-language': lang });
    const row = await throttled(() => getJson(`${NOMINATIM}/reverse?${params}`)).catch(() => null) as NominatimRow | null;
    const around = row && 'address' in row ? toPlace(row).address : {};
    const keep = Object.fromEntries(Object.entries(around).filter(([k]) => REGION_KEYS.has(k)));
    const place: Place = { ...base, displayName: [local[lang], cities[lang]].join(', '), address: { ...keep, suburb: local[lang], city: cities[lang] } };
    cache.set(`l|${lang}|${d.osm}`, [place]);
    if (lang === 'en') english = place;
  }
  return english;
}

/**
 * The best place for one query. A named landmark wins when the query names it
 * ("Kingdom Centre Tower"); otherwise a hotel or shop that merely sits on the
 * street ("Olaya Street") is passed over for the street itself. In strict
 * mode nothing else is accepted, so the caller can try a looser query first.
 */
export async function bestMatch(query: string, country?: string, near?: { lat: number; lng: number }, strict = true): Promise<Place | null> {
  // "Al Malqa, Riyadh" / "حي الملقا، الرياض": a district and nothing more specific is the district itself,
  // found in the saved list, which copes with spellings that OpenStreetMap search misses
  const all = query.split(/[,،]/).map(p => p.trim()).filter(Boolean);
  const parts = all.filter(p => !COUNTRY_NAMES.test(p));
  if (parts.length && parts.length <= 2) {
    // "Salmiya, Kuwait": the city shares the country's name, so it is the last part even when dropped above
    const m = findDistrict(parts[0], { near, city: parts[1] ?? (all.length > 1 ? all[all.length - 1] : undefined) });
    if (m) return districtPlace(m);
  }

  const fits = (p: Place) => ADDRESS_TYPES.has(p.type) || asksFor(p, query);
  const top = await searchMany(query, country, false, near, 10);
  // of the results that fit, the one whose name the query mentions most
  // (ties go to the more prominent place: the district "Al Olaya" over a street named after it)
  const hit = top.filter(fits).sort((a, b) => nameScore(b, query) - nameScore(a, query) || b.importance - a.importance)[0];
  if (hit) return hit;
  const addr = await search(query, country, true, near);
  if (addr && fits(addr)) return addr;
  // loose mode: a business near the right street is still better than nothing
  return strict ? null : top[0] ?? addr;
}
