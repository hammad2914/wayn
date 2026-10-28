// District names for the main Gulf cities, matched locally.
// OpenStreetMap search compares words exactly, so "Al Malqa" misses the district it
// stores as "Al Malga District" and lands on a street of the same name instead.
// The saved list (scripts/build-districts.ts) lets us match spelling variants here.
import data from '../data/districts.json';

interface District { n: string; en?: string; ar?: string; lat: number; lng: number; osm: string; k: 'a' | 'n' | 's' | 'q' }
interface City { city: string; country: string; names: string[]; bbox: number[]; districts: District[] }

// words that say "this is a district" rather than naming it, plus the Arabic article in Latin spelling
const STOP = new Set(['al', 'el', 'ar', 'as', 'ad', 'an', 'at', 'az', 'ash', 'adh', 'ath', 'district', 'neighborhood', 'neighbourhood', 'hay', 'hayy', 'hai', 'dist']);
const AR_STOP = new Set(['حي', 'حى', 'بلدية']);
const ARABIC = /[؀-ۿ]/;

const latinWords = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[`'’‘ʿʾ]/g, '').replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/).filter(w => w && !STOP.has(w));

/** Spelling with the usual vowel swaps evened out: Naseem / Nasim, Olaya / Ulayya */
const soft = (s: string) => latinWords(s).join('')
  .replace(/ee/g, 'i').replace(/oo|ou/g, 'u').replace(/o/g, 'u').replace(/e/g, 'i')
  .replace(/(.)\1+/g, '$1').replace(/h$/, '');

/** Consonants only, for spellings that differ more: Malqa / Malga, Sulimaniyah / Sulaymaniyah */
const skeleton = (s: string) => latinWords(s).join('')
  .replace(/q/g, 'g').replace(/gh/g, 'g').replace(/kh/g, 'k')
  .replace(/[aeiouyhw]/g, '').replace(/(.)\1+/g, '$1');

/** Arabic without diacritics, hamza forms, "حي" or the article: "حي السلى" = "السلي" */
const arabic = (s: string) => s
  .replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .split(/\s+/).filter(w => w && !AR_STOP.has(w)).map(w => w.replace(/^ال/, '')).join('');

const cities = (data as { cities: City[] }).cities.map(c => {
  // one lookup table per kind of key
  const by = { soft: new Map<string, District[]>(), skel: new Map<string, District[]>(), ar: new Map<string, District[]>() };
  const add = (m: Map<string, District[]>, key: string, d: District) => { if (key) m.set(key, [...(m.get(key) ?? []), d]); };
  for (const d of c.districts) {
    for (const name of [d.n, d.en].filter((x): x is string => !!x && !ARABIC.test(x))) {
      add(by.soft, soft(name), d);
      const sk = skeleton(name);
      if (sk.length >= 3) add(by.skel, sk, d);
    }
    for (const name of [d.n, d.ar].filter((x): x is string => !!x && ARABIC.test(x))) add(by.ar, arabic(name), d);
  }
  return { ...c, by, names: c.names.map(n => n.toLowerCase()) };
});

const RANK = { a: 0, n: 1, s: 2, q: 3 };
const inBox = (b: number[], p: { lat: number; lng: number }) => p.lat >= b[0] && p.lng >= b[1] && p.lat <= b[2] && p.lng <= b[3];

/** The city a name belongs to ("الرياض" and "Riyadh" both give Riyadh), if it is one of ours */
export function cityOf(name: string): string | null {
  const n = name.trim().toLowerCase();
  return cities.find(c => c.names.includes(n))?.city ?? null;
}

export interface DistrictMatch { district: District; city: string; cityAr: string }

/**
 * The district a name refers to, in the city given by a nearby point or by name.
 * Only whole-name matches count, so "Olaya Street" is not mistaken for the district.
 */
export function findDistrict(name: string, where: { near?: { lat: number; lng: number }; city?: string }): DistrictMatch | null {
  const city = where.city?.trim().toLowerCase();
  const pool = cities.filter(c => (where.near && inBox(c.bbox, where.near)) || (city && c.names.includes(city)));
  if (!pool.length) return null;
  // the city's own name is not a district in it
  if (pool.some(c => c.names.includes(name.trim().toLowerCase()))) return null;

  const found: { d: District; city: string; cityAr: string }[] = [];
  for (const c of pool) {
    let hits: District[] = [];
    if (ARABIC.test(name)) hits = c.by.ar.get(arabic(name)) ?? [];
    else {
      hits = c.by.soft.get(soft(name)) ?? [];
      const sk = skeleton(name);
      if (!hits.length && sk.length >= 3) hits = c.by.skel.get(sk) ?? [];
    }
    const cityAr = c.names.find(n => ARABIC.test(n)) ?? c.city;
    for (const d of hits) found.push({ d, city: c.city, cityAr });
  }
  if (!found.length) return null;

  // a district boundary beats a point label; then the one closest to the city point
  const dist = (d: District) => where.near ? (d.lat - where.near.lat) ** 2 + (d.lng - where.near.lng) ** 2 : 0;
  found.sort((a, b) => RANK[a.d.k] - RANK[b.d.k] || dist(a.d) - dist(b.d));
  const best = found[0];
  return { district: best.d, city: best.city, cityAr: best.cityAr };
}
