import backendClient from './api';
import { BACKEND_API } from '../config/api';

// ── Dispatch: today's orders, the run that delivers them, and what happened ──

export type OrderState = 'cleaning' | 'ready' | 'check' | 'pin';
export type Match = 'street' | 'landmark' | 'place' | 'pinned' | 'district' | 'city';

export interface Order {
  id: string; ref: number; customer: string; phone: string | null; text: string; kg: number;
  state: OrderState; match: Match | null; en: string | null; ar: string | null;
  lat: number | null; lng: number | null; notes: string[]; confidence: number | null;
  runId: string | null; vanId: string | null; seq: number | null;
  eta: string | null; deliveredAt: string | null; createdAt: string;
}
export interface Van {
  id: string; index: number; driver: string; token: string; capacity: number;
  km: number; minutes: number; load: number; line: [number, number][];
}
export interface Depot { address: string; lat: number; lng: number }
export interface Run { id: string; depot: Depot; startAt: string; vans: Van[] }
export interface DispatchEvent { id: string; kind: string; data: Record<string, string | number | null>; createdAt: string }
export interface Today {
  day: string; now: string; orders: Order[]; runs: Run[]; events: DispatchEvent[];
  /** the last run ever planned, to fill in the depot and vans next time */
  last: { depot: Depot; vans: { driver: string; capacity: number }[] } | null;
}

export interface NewOrder { customer: string; text: string; kg?: number; phone?: string }
export interface VanInput { driver: string; capacity: number }

type Ok<T> = { data: T };

export const dispatchAPI = {
  today:     async () => (await backendClient.get<Ok<Today>>('/dispatch/today')).data.data,
  addOrders: (body: { country: string; city?: string; orders: NewOrder[] }) => backendClient.post('/dispatch/orders', body),
  confirm:   (id: string) => backendClient.patch(`/dispatch/orders/${id}`, { action: 'confirm' }),
  pin:       (id: string, lat: number, lng: number) => backendClient.patch(`/dispatch/orders/${id}`, { action: 'pin', lat, lng }),
  remove:    (id: string) => backendClient.delete(`/dispatch/orders/${id}`),
  // planning reads road distances for every pair of stops and draws each van's line: allow a minute
  planRun:   async (body: { depot: { address: string; lat?: number; lng?: number }; vans: VanInput[]; start?: string }) =>
    (await backendClient.post<Ok<{ run: Run; unassigned: number[] }>>('/dispatch/runs', body, { timeout: 90000 })).data.data,
};

/** The server's message for a failed request, if it sent one */
export const messageOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
  ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
  ?? fallback;

// ── The driver's link: no sign-in, so plain fetch without the client's token handling ──

export interface DriverStop {
  id: string; seq: number; customer: string; phone: string | null; text: string; en: string | null; ar: string | null;
  notes: string[]; lat: number | null; lng: number | null; kg: number; eta: string | null; deliveredAt: string | null;
}
export interface DriverRun { company: string; driver: string; van: number; day: string; depot: Depot; startAt: string; km: number; stops: DriverStop[] }

export const driverAPI = {
  run: async (token: string): Promise<DriverRun> => {
    const res = await fetch(`${BACKEND_API}/driver/${encodeURIComponent(token)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || 'down');
    return body.data;
  },
  mark: async (token: string, id: string, delivered: boolean) => {
    const res = await fetch(`${BACKEND_API}/driver/${encodeURIComponent(token)}/orders/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivered }),
    });
    if (!res.ok) throw new Error('down');
    return (await res.json()).data as { id: string; deliveredAt: string | null };
  },
};
