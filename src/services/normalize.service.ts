import { search, bestMatch, candidates, lookup, landmarkIn, AREA_TYPES, type Place } from './geocode.service';

// Rule-based cleanup for addresses written the way people type them in the
// Arabic-speaking world: mixed scripts, Arabic-Indic digits, landmarks instead
// of street numbers. The cleaned text is then matched on OpenStreetMap.

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const toLatinDigits = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, d => String(Math.max(ARABIC_DIGITS.indexOf(d), PERSIAN_DIGITS.indexOf(d))));

// "near the mosque", "behind the pharmacy", "opposite gate 3"…
const LANDMARK_RE = /(^|\s)(near|opposite|behind|next to|beside|in front of|across from|قرب|بالقرب من|بجانب|جنب|مقابل|قبال|خلف|ورا|وراء|امام|أمام|عند)(\s|$)/i;
// details the driver needs but the map can't match: floor, flat, gate colour…
const DETAIL_RE = /(^|\s)(floor|flr|flat|apt|apartment|office|gate|door|الدور|الطابق|شقة|مكتب|البوابة|بوابة|الباب)(\s|$)/i;
const BUILDING_RE = /(?:building|bldg|villa|house|no\.?|مبنى|عمارة|فيلا|بيت|منزل|رقم)\s*(?:no\.?|number|رقم)?\s*#?\s*(\d{1,5})\b/i;
const POSTAL_RE = /\b(\d{5})\b/;

// OpenStreetMap names districts "Al Olaya" / "العليا", not "حي العليا",
// and has no idea what "st" or "rd" means
const ABBREVIATIONS: [RegExp, string][] = [
  [/^(حي|حى|ضاحية|district|dist\.?)\s+/i, ''],
  [/\s+(district|dist\.?)$/i, ''],
  [/\bst\.?$/i, 'Street'], [/\bst\.?\s/i, 'Street '],
  [/\brd\.?$/i, 'Road'], [/\brd\.?\s/i, 'Road '],
  [/\bave?\.?$/i, 'Avenue'],
];
const cleanSegment = (s: string) =>
  ABBREVIATIONS.reduce((acc, [re, to]) => acc.replace(re, to), s.replace(/\s+/g, ' ').trim()).trim();

// how exact a match is, by the kind of OpenStreetMap object it landed on
const PRECISION: Record<string, number> = {
  building: 0.95, house: 0.95, amenity: 0.9, shop: 0.9, office: 0.9, place: 0.88,
  road: 0.85, primary: 0.85, secondary: 0.85, tertiary: 0.85, trunk: 0.8, motorway: 0.75,
  residential: 0.82, landmark: 0.82, quarter: 0.75, neighbourhood: 0.75, suburb: 0.72,
  city_district: 0.65, village: 0.6, town: 0.55, city: 0.5, county: 0.4, state: 0.3, country: 0.2,
};

export interface NormalizeInput {
  address: string;
  country?: string;
  include_geocoding?: boolean;
}

const pick = (a: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (a[k]) return a[k];
  return null;
};

const street = (a: Record<string, string>) => pick(a, 'road', 'pedestrian', 'street', 'residential');
const area = (a: Record<string, string>) => pick(a, 'neighbourhood', 'suburb', 'quarter', 'city_district', 'district');
const city = (a: Record<string, string>) => pick(a, 'city', 'town', 'village', 'municipality', 'state');

export async function normalize(input: NormalizeInput) {
  const started = Date.now();
  const original = input.address.trim();
  const text = toLatinDigits(original).replace(/[،؛]/g, ',').replace(/\s+/g, ' ');

  const building = text.match(BUILDING_RE)?.[1] ?? null;
  const postalFromText = text.match(POSTAL_RE)?.[1] ?? null;

  // "olaya st near kingdom tower": the part before "near" is the address,
  // the rest is a landmark the driver should see
  const landmarks: string[] = [];
  const searchable: string[] = [];
  for (const raw of text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)) {
    const m = raw.match(LANDMARK_RE);
    // "the pharmacy opposite": the keyword comes last, so the whole part is a landmark
    const keywordLast = m && raw.slice((m.index ?? 0) + m[0].length).trim() === '';
    const before = m && !keywordLast ? raw.slice(0, m.index).trim() : m ? '' : raw;
    if (m) landmarks.push(keywordLast ? raw : raw.slice(m.index).trim());
    // floor / gate details can't be matched on a map, but the driver needs them
    if (DETAIL_RE.test(before) && !/\d{3,}/.test(before.replace(BUILDING_RE, ''))) { landmarks.push(before); continue; }
    const clean = cleanSegment(before.replace(BUILDING_RE, '').replace(POSTAL_RE, ''));
    if (clean) searchable.push(clean);
  }

  // try the full address, then keep dropping the most specific part.
  // Streets and districts first; only then shops and landmarks.
  let place: Place | null = null;
  let fallbacks = 0;
  const queries = candidates(searchable.join(', '));

  // find the city first and keep every other match within reach of it, so
  // "العليا" means the Riyadh district, not a village of the same name
  const cityPlace = searchable.length > 1 ? await search(searchable[searchable.length - 1], input.country) : null;
  const near = cityPlace && ['city', 'town', 'village', 'municipality', 'state'].includes(cityPlace.type)
    ? { lat: cityPlace.lat, lng: cityPlace.lng } : undefined;
  for (const strict of [true, false]) {
    fallbacks = strict ? 0 : 1;
    for (const q of queries) {
      place = await bestMatch(q, input.country, near, strict);
      if (place) break;
      fallbacks++;
    }
    if (place) break;
  }
  // last resort: the landmark itself ("Al Nakheel mall")
  if (!place && landmarks.length) {
    const lm = cleanSegment(landmarks[0].replace(LANDMARK_RE, ' '));
    place = await search([lm, searchable[searchable.length - 1]].filter(Boolean).join(', '), input.country);
    fallbacks++;
  }

  if (!place) {
    return {
      success: false,
      original_address: original,
      normalized_address: text,
      normalized_english: text,
      components: { building_number: building, street_name: null, street_name_ar: null, area: null, area_ar: null, city: null, city_ar: null, landmarks, postal_code: postalFromText },
      confidence_score: 0,
      processing_time_ms: Date.now() - started,
      from_cache: false, from_learning: false, ai_enhanced: false,
      provider: 'openstreetmap',
      geocoding: null,
      error: 'No match found on the map. Try adding the district or city.',
    };
  }

  // "behind Mall of the Emirates, Al Barsha 1": when the match only reached the district, a landmark
  // the customer named pins it closer, as long as that landmark is inside the same district
  let pin: Place | null = null;
  if (AREA_TYPES.has(place.type)) {
    const named = landmarks.filter(l => LANDMARK_RE.test(l)).map(l => cleanSegment(l.replace(LANDMARK_RE, ' '))).filter(l => l.length > 2);
    if (named.length) pin = await landmarkIn(place, named, input.country);
  }

  const ar = (await lookup(place, 'ar')) ?? place;
  const en = place.address, arA = ar.address;

  let confidence = pin ? PRECISION.landmark : PRECISION[place.type] ?? 0.6;
  confidence -= 0.1 * fallbacks;
  if (building) confidence += 0.03;
  confidence = Math.round(Math.min(0.99, Math.max(0.1, confidence)) * 100) / 100;

  // a named place (mall, mosque, tower) leads the address when that's what matched
  const placeName = !['road', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway', 'residential', 'neighbourhood', 'suburb', 'quarter', 'city_district', 'city', 'town', 'village'].includes(place.type)
    ? place.names : [];
  const nameEn = placeName.find(n => /[a-z]/i.test(n)) ?? null;
  const nameAr = placeName.find(n => /[؀-ۿ]/.test(n)) ?? nameEn;

  const components = {
    building_number: building ?? en.house_number ?? null,
    street_name:     street(en),
    street_name_ar:  street(arA),
    area:            area(en),
    area_ar:         area(arA),
    city:            city(en),
    city_ar:         city(arA),
    landmarks,
    postal_code:     postalFromText ?? en.postcode ?? null,
  };

  const join = (parts: (string | null)[]) => parts.filter(Boolean).join(', ');
  return {
    success: true,
    original_address: original,
    normalized_address: join([components.building_number, nameAr, components.street_name_ar, components.area_ar, components.city_ar, components.postal_code]),
    normalized_english: join([components.building_number, nameEn, components.street_name, components.area, components.city, components.postal_code]),
    components,
    confidence_score: confidence,
    processing_time_ms: Date.now() - started,
    from_cache: false, from_learning: false, ai_enhanced: false,
    provider: 'openstreetmap',
    geocoding: input.include_geocoding === false ? null : {
      latitude: (pin ?? place).lat,
      longitude: (pin ?? place).lng,
      accuracy: pin ? 'landmark' : place.type,
      provider: 'openstreetmap',
    },
    error: null,
  };
}
