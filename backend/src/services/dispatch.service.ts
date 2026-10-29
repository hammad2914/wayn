import { prisma } from '../lib/prisma';
import { normalize } from './normalize.service';

// The dispatch day turns over at local midnight: Gulf Standard Time in the UAE and Oman,
// Arabia Standard Time everywhere else Wayn covers.
const UTC_OFFSET: Record<string, number> = { AE: 4, OM: 4 };
const offsetOf = (country?: string | null) => UTC_OFFSET[country ?? ''] ?? 3;

export const dayOf = (country?: string | null, at = new Date()) =>
  new Date(at.getTime() + offsetOf(country) * 36e5).toISOString().slice(0, 10);

/** "08:30" on a dispatch day, in the company's local time */
export const localTime = (day: string, hhmm: string, country?: string | null) =>
  new Date(`${day}T${hhmm}:00+0${offsetOf(country)}:00`);

const DISTRICT = new Set(['suburb', 'neighbourhood', 'quarter', 'city_district', 'district', 'borough']);
const CITY = new Set(['city', 'town', 'village', 'hamlet', 'municipality', 'county', 'state', 'country']);
const STREET = new Set(['road', 'primary', 'secondary', 'tertiary', 'trunk', 'motorway', 'residential', 'unclassified',
  'service', 'living_street', 'pedestrian', 'building', 'house', 'apartments']);

/** How close the match got, and so whether the order can go straight on a van */
export function sortMatch(accuracy?: string | null): { match: string | null; state: 'ready' | 'check' | 'pin' } {
  if (!accuracy) return { match: null, state: 'pin' };
  if (accuracy === 'landmark') return { match: 'landmark', state: 'ready' };
  if (CITY.has(accuracy)) return { match: 'city', state: 'pin' };
  if (DISTRICT.has(accuracy)) return { match: 'district', state: 'check' };
  if (STREET.has(accuracy)) return { match: 'street', state: 'ready' };
  return { match: 'place', state: 'ready' };
}

export const logEvent = (userId: string, day: string, kind: string, data: object) =>
  prisma.dispatchEvent.create({ data: { userId, day, kind, data } });

// New orders are cleaned one at a time in the background: the map service allows one
// request a second for the whole server, so a batch of 30 takes a minute or two either way.
const queue = new Set<string>();
const failedAt = new Map<string, number>();
let draining = false;

export function clean(ids: string[]) {
  for (const id of ids) {
    // an order that just failed (map service down) waits a minute before the next try
    if (Date.now() - (failedAt.get(id) ?? 0) > 60_000) queue.add(id);
  }
  if (!draining) void drain();
}

async function drain() {
  draining = true;
  while (queue.size) {
    const id = queue.values().next().value as string;
    try {
      await cleanOne(id);
      failedAt.delete(id);
    } catch (err) {
      console.error('[dispatch] could not clean order', id, err);
      failedAt.set(id, Date.now());
    }
    queue.delete(id);
  }
  draining = false;
}

async function cleanOne(id: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.state !== 'cleaning') return;
  // customers rarely write the city; the batch's city keeps "Al Rawdah" in the right one
  const named = order.city && order.text.toLowerCase().includes(order.city.toLowerCase());
  const r = await normalize({ address: order.city && !named ? `${order.text}, ${order.city}` : order.text, country: order.country });
  const { match, state } = r.success ? sortMatch(r.geocoding?.accuracy) : sortMatch(null);
  await prisma.order.update({
    where: { id },
    data: {
      state, match,
      en: r.success ? r.normalized_english : null,
      ar: r.success ? r.normalized_address : null,
      lat: r.geocoding?.latitude ?? null,
      lng: r.geocoding?.longitude ?? null,
      confidence: r.confidence_score,
      notes: r.components.landmarks,
    },
  });
  if (state === 'pin') await logEvent(order.userId, order.day, 'needs_pin', { ref: order.ref, customer: order.customer, match });
}
