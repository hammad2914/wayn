// Builds src/data/districts.json: the named districts of the main Gulf cities,
// from OpenStreetMap through the Overpass API.
//
// Why: OpenStreetMap search matches names word for word, so "Al Malqa" misses the
// district it stores as "Al Malga District", and lands on one of eight streets
// called "Al Malqa" instead. With the district list saved locally, the geocoder
// can match spelling variants itself.
//
// Run:  npx ts-node --transpile-only scripts/build-districts.ts
// Re-run now and then; districts change slowly. The public Overpass servers are
// often busy, so each city is retried on several of them.
import fs from 'fs';
import path from 'path';

const SERVERS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

// centre and half-size of the box in degrees, plus the names people use for the city
const CITIES: { city: string; country: string; lat: number; lng: number; r: number; names: string[] }[] = [
  { city: 'Riyadh',    country: 'SA', lat: 24.71, lng: 46.68, r: 0.45, names: ['riyadh', 'الرياض'] },
  { city: 'Jeddah',    country: 'SA', lat: 21.54, lng: 39.17, r: 0.35, names: ['jeddah', 'jiddah', 'jedda', 'جدة', 'جده'] },
  { city: 'Mecca',     country: 'SA', lat: 21.42, lng: 39.83, r: 0.2,  names: ['mecca', 'makkah', 'makka', 'مكة', 'مكة المكرمة'] },
  { city: 'Medina',    country: 'SA', lat: 24.47, lng: 39.61, r: 0.2,  names: ['medina', 'madinah', 'al madinah', 'المدينة', 'المدينة المنورة'] },
  { city: 'Dammam',    country: 'SA', lat: 26.36, lng: 50.13, r: 0.25, names: ['dammam', 'khobar', 'al khobar', 'dhahran', 'الدمام', 'الخبر', 'الظهران'] },
  { city: 'Dubai',     country: 'AE', lat: 25.15, lng: 55.27, r: 0.3,  names: ['dubai', 'دبي'] },
  { city: 'Abu Dhabi', country: 'AE', lat: 24.43, lng: 54.45, r: 0.3,  names: ['abu dhabi', 'abudhabi', 'أبوظبي', 'أبو ظبي', 'ابوظبي'] },
  { city: 'Sharjah',   country: 'AE', lat: 25.33, lng: 55.43, r: 0.15, names: ['sharjah', 'الشارقة'] },
  { city: 'Doha',      country: 'QA', lat: 25.29, lng: 51.50, r: 0.25, names: ['doha', 'الدوحة'] },
  { city: 'Kuwait',    country: 'KW', lat: 29.33, lng: 47.98, r: 0.3,  names: ['kuwait', 'kuwait city', 'الكويت', 'مدينة الكويت'] },
  { city: 'Manama',    country: 'BH', lat: 26.21, lng: 50.57, r: 0.15, names: ['manama', 'المنامة'] },
  { city: 'Muscat',    country: 'OM', lat: 23.59, lng: 58.38, r: 0.3,  names: ['muscat', 'مسقط'] },
];

interface El { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function overpass(query: string): Promise<El[]> {
  let last: unknown;
  for (let round = 0; round < 3; round++)
    for (const url of SERVERS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Wayn/1.0 (district list builder)' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(120000),
        });
        const text = await res.text();
        if (!res.ok || !text.startsWith('{')) throw new Error(`${url}: ${res.status} ${text.slice(0, 60)}`);
        return (JSON.parse(text) as { elements: El[] }).elements;
      } catch (err) { last = err; await sleep(5000); }
    }
  throw last;
}

// municipalities and the like are bigger than a district: leave them out
const NOT_DISTRICT = /municipality|muncipality|governorate|بلدية|محافظة/i;

(async () => {
  const out = [];
  for (const c of CITIES) {
    const bb = [c.lat - c.r, c.lng - c.r, c.lat + c.r, c.lng + c.r].join(',');
    const els = await overpass(`[out:json][timeout:90];(node["place"~"^(suburb|neighbourhood|quarter)$"](${bb});relation["boundary"="administrative"]["admin_level"~"^(9|10)$"](${bb}););out center tags qt;`);
    const districts = els
      .filter(e => e.tags?.name && !NOT_DISTRICT.test([e.tags.name, e.tags['name:en'] ?? ''].join(' ')))
      .map(e => {
        const p = e.center ?? { lat: e.lat!, lon: e.lon! };
        const t = e.tags!;
        return {
          n: t.name, en: t['name:en'], ar: t['name:ar'],
          lat: +p.lat.toFixed(5), lng: +p.lon.toFixed(5),
          osm: `${e.type[0].toUpperCase()}${e.id}`,
          // a boundary (relation) outranks a point label of the same name
          k: e.type === 'relation' ? 'a' : t.place === 'neighbourhood' ? 'n' : t.place === 'suburb' ? 's' : 'q',
        };
      });
    out.push({ city: c.city, country: c.country, names: c.names, bbox: [c.lat - c.r, c.lng - c.r, c.lat + c.r, c.lng + c.r], districts });
    console.log(`${c.city}: ${districts.length} districts`);
    await sleep(3000);
  }
  const file = path.join(__dirname, '..', 'src', 'data', 'districts.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: 'OpenStreetMap via Overpass (ODbL)', cities: out }));
  console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
})();
