import type { NewOrder, Order } from '../../services/dispatch';
import type { TranslationKey } from '../../translations';

export const VAN_COLORS = ['#F5C842', '#8FB4FF', '#6FD3A0', '#F0A54A', '#C9A3FF', '#FF9E8F', '#5FD4D9', '#E6E07A', '#FFB3D9', '#A8C686'];
export const vanColor = (index: number) => VAN_COLORS[index % VAN_COLORS.length];

export const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_';

/** "{n} orders" with the blanks filled in */
export const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

export type T = (key: TranslationKey) => string;

/** Leaflet tooltips take HTML: customer names and addresses come from pasted sheets */
export const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** 24-hour clock time; Arabic keeps Western digits like the rest of the app */
export const clock = (at: string | Date, lang: 'en' | 'ar') =>
  new Date(at).toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

// How close each order's match got, in the order the dashboard lists them
export const MATCHES = [
  { key: 'street',   color: 'var(--ok)' },
  { key: 'landmark', color: 'var(--ok)' },
  { key: 'place',    color: 'var(--ok)' },
  { key: 'pinned',   color: 'var(--ok)' },
  { key: 'district', color: 'var(--check)' },
  { key: 'city',     color: 'var(--warn)' },
  { key: 'cleaning', color: 'var(--faint)' },
] as const;
export type MatchKey = typeof MATCHES[number]['key'];
export const matchOf = (o: Order): MatchKey => (o.state === 'cleaning' ? 'cleaning' : o.match ?? 'city');
export const matchColor = (o: Order) => MATCHES.find(m => m.key === matchOf(o))!.color;

/** Where an order stands today, for the table's tabs and its status column */
export type Stage = 'cleaning' | 'check' | 'pin' | 'ready' | 'road' | 'done';
export const stageOf = (o: Order): Stage =>
  o.deliveredAt ? 'done' : o.vanId ? 'road' : o.state;

/**
 * Rows pasted from a sheet arrive tab-separated: customer, address, then kg and phone in any order.
 * A line with no tabs is just an address.
 */
export function parseOrders(text: string): NewOrder[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // a header row copied with the data
  if (lines.length && /^(customer|name|العميل|الاسم)\b/i.test(lines[0])) lines.shift();
  return lines.map((line, i) => {
    const cols = line.split('\t').map(c => c.trim()).filter(Boolean);
    if (cols.length < 2) return { customer: `#${i + 1}`, text: line };
    const [customer, address, ...rest] = cols;
    const digits = (c: string) => c.replace(/\D/g, '').length;
    const kg = rest.find(c => /^\d+([.,]\d+)?$/.test(c) && digits(c) <= 5);
    const phone = rest.find(c => /^\+?[\d\s()-]+$/.test(c) && digits(c) >= 7);
    return { customer: customer.slice(0, 80), text: address, kg: kg ? Number(kg.replace(',', '.')) : undefined, phone };
  }).filter(o => o.text.length >= 3);
}
