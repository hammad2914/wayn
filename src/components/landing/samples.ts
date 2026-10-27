// Sample data for the landing page.
// The three addresses below are what the Wayn engine (POST /api/engine/normalize)
// returned for these exact inputs on 27 Oct 2026, saved so visitors can see it
// without an account. Re-run them if the engine changes.

export type Precision = 'district' | 'street' | 'place';

export interface Sample {
  labelKey: 'land.sample1' | 'land.sample2' | 'land.sample3';
  raw: string;
  rtl: boolean;
  precision: Precision;
  confidence: number;
  lat: number;
  lng: number;
  en: { building: string | null; place: string | null; street: string | null; district: string; city: string; postal: string };
  ar: { building: string | null; place: string | null; street: string | null; district: string; city: string; postal: string };
  notes: string[];
}

export const SAMPLES: Sample[] = [
  {
    labelKey: 'land.sample1',
    raw: 'ورا مسجد الراجحي، حي النسيم الغربي، فيلا رقم ١٤ البوابة السودا، الرياض',
    rtl: true,
    precision: 'district',
    confidence: 0.78,
    lat: 24.7279145, lng: 46.8233278,
    en: { building: '14', place: null, street: null, district: 'Al Naseem District West', city: 'Riyadh', postal: '14231' },
    ar: { building: '14', place: null, street: null, district: 'النسيم الغربي', city: 'الرياض', postal: '14231' },
    notes: ['ورا مسجد الراجحي', 'فيلا رقم 14 البوابة السودا'],
  },
  {
    labelKey: 'land.sample2',
    raw: 'olaya st near kingdom tower, bldg 7720 office 3rd flr, riyadh',
    rtl: false,
    precision: 'street',
    confidence: 0.88,
    lat: 24.7066354, lng: 46.6786532,
    en: { building: '7720', place: null, street: 'Al Olaya Street', district: 'Al `Ulayya', city: 'Riyadh', postal: '12244' },
    ar: { building: '7720', place: null, street: 'شارع العليا', district: 'العليا', city: 'الرياض', postal: '12244' },
    notes: ['near kingdom tower', 'bldg 7720 office 3rd flr'],
  },
  {
    labelKey: 'land.sample3',
    raw: 'Al Nakheel mall, gate 3, the pharmacy opposite, riyadh',
    rtl: false,
    precision: 'place',
    confidence: 0.9,
    lat: 24.7667684, lng: 46.7157705,
    en: { building: null, place: 'Al Nakheel Mall', street: 'Al Imam Saud Ibn Abdulaziz Ibn Mohammad Road', district: 'Al Mugharzat District', city: 'Riyadh', postal: '12485' },
    ar: { building: null, place: 'النخيل مول', street: 'طريق الإمام سعود بن عبد العزيز بن محمد', district: 'المغرزات', city: 'الرياض', postal: '12485' },
    notes: ['gate 3', 'the pharmacy opposite'],
  },
];

// One delivery run for the route section: depot in Al Sulay and eight stops,
// in the order the orders came in. District centres, not real customers.
export const DEPOT = { name: 'Al Sulay', nameAr: 'السلي', lat: 24.5895, lng: 46.8128 };
export const STOPS = [
  { id: 1, name: 'Al Malqa', nameAr: 'الملقا', lat: 24.8115, lng: 46.6094, kg: 12 },
  { id: 2, name: 'Al Rawdah', nameAr: 'الروضة', lat: 24.7356, lng: 46.7716, kg: 4 },
  { id: 3, name: 'Al Olaya', nameAr: 'العليا', lat: 24.7115, lng: 46.6744, kg: 9 },
  { id: 4, name: 'Al Yasmin', nameAr: 'الياسمين', lat: 24.8268, lng: 46.6417, kg: 6 },
  { id: 5, name: 'Al Naseem', nameAr: 'النسيم', lat: 24.7362, lng: 46.8273, kg: 15 },
  { id: 6, name: 'Al Sulimaniyah', nameAr: 'السليمانية', lat: 24.7012, lng: 46.7003, kg: 3 },
  { id: 7, name: 'Al Nakheel', nameAr: 'النخيل', lat: 24.7480, lng: 46.6380, kg: 8 },
  { id: 8, name: 'Al Mughrizat', nameAr: 'المغرزات', lat: 24.7681, lng: 46.7121, kg: 5 },
];
export type StopPoint = typeof STOPS[number];
type Pt = { lat: number; lng: number };

const km = (a: Pt, b: Pt) => {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const tourKm = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + km(pts[i], p), 0);

/** Nearest neighbour, then 2-opt: the same ordering the real optimizer uses */
export const planOrder = (depot: Pt, stops: StopPoint[]): StopPoint[] => {
  const left = stops.slice(), out: StopPoint[] = [];
  let cur: Pt = depot;
  while (left.length) {
    let best = 0;
    left.forEach((s, i) => { if (km(cur, s) < km(cur, left[best])) best = i; });
    cur = left.splice(best, 1)[0];
    out.push(cur as StopPoint);
  }
  const len = (o: StopPoint[]) => tourKm([depot, ...o, depot]);
  for (let improved = true; improved;) {
    improved = false;
    for (let i = 0; i < out.length - 1; i++)
      for (let j = i + 1; j < out.length; j++) {
        const cand = [...out.slice(0, i), ...out.slice(i, j + 1).reverse(), ...out.slice(j + 1)];
        if (len(cand) + 1e-9 < len(out)) { out.splice(0, out.length, ...cand); improved = true; }
      }
  }
  return out;
};
