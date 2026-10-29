import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { normalize } from '../services/normalize.service';
import { plan, roadLine } from '../services/route.service';
import { dayOf, localTime, clean, logEvent } from '../services/dispatch.service';

// a day's orders per company: the map service is shared and free, so keep it well within reach
const DAY_CAP = 150;
const MAX_STOPS = 60;      // the public routing server's table limit is about 100 points
const STOP_MINUTES = 5;    // time at each door, counted into the arrival times

const countryOf = async (userId: string) =>
  (await prisma.user.findUnique({ where: { id: userId }, select: { country: true } }))?.country ?? null;

const invalid = (res: Response, error: z.ZodError) =>
  sendError(res, error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));

// ── GET /dispatch/today ───────────────────────────────────────────────────────
export const today = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const day = dayOf(await countryOf(userId));
  const [orders, runs, events, lastRun] = await Promise.all([
    prisma.order.findMany({ where: { userId, day }, orderBy: { ref: 'asc' } }),
    prisma.run.findMany({ where: { userId, day }, orderBy: { createdAt: 'asc' }, include: { vans: { orderBy: { index: 'asc' } } } }),
    prisma.dispatchEvent.findMany({ where: { userId, day }, orderBy: { createdAt: 'desc' }, take: 80 }),
    prisma.run.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { depot: true, vans: { select: { driver: true, capacity: true }, orderBy: { index: 'asc' } } } }),
  ]);
  // orders left half-way by a restart go back in the queue
  const waiting = orders.filter(o => o.state === 'cleaning').map(o => o.id);
  if (waiting.length) clean(waiting);
  sendSuccess(res, { day, now: new Date().toISOString(), orders, runs, events, last: lastRun });
};

// ── POST /dispatch/orders ─────────────────────────────────────────────────────
const ordersSchema = z.object({
  country: z.string().length(2),
  city:    z.string().trim().max(60).optional(),
  orders:  z.array(z.object({
    customer: z.string().trim().min(1).max(80),
    text:     z.string().trim().min(3).max(300),
    kg:       z.number().min(0).max(5000).optional(),
    phone:    z.string().trim().max(30).optional(),
  })).min(1).max(100),
});

export const addOrders = async (req: AuthRequest, res: Response) => {
  const parsed = ordersSchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const userId = req.userId!;
  const day = dayOf(await countryOf(userId));
  const { country, city, orders } = parsed.data;

  const already = await prisma.order.count({ where: { userId, day } });
  if (already + orders.length > DAY_CAP) {
    sendError(res, `Up to ${DAY_CAP} orders a day. ${Math.max(DAY_CAP - already, 0)} more fit today.`, 429);
    return;
  }
  const last = await prisma.order.findFirst({ where: { userId }, orderBy: { ref: 'desc' }, select: { ref: true } });
  let ref = last?.ref ?? 1000;
  const created = await prisma.$transaction(orders.map(o => prisma.order.create({
    data: { userId, day, ref: ++ref, customer: o.customer, phone: o.phone || null, text: o.text, kg: o.kg ?? 0, country, city: city || null },
  })));
  await logEvent(userId, day, 'orders_added', { count: created.length });
  clean(created.map(o => o.id));
  sendSuccess(res, created, 201);
};

// ── PATCH /dispatch/orders/:id ── confirm a district-level match, or drop a pin ──
const updateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }),
  z.object({ action: z.literal('pin'), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
]);

export const updateOrder = async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), userId: req.userId } });
  if (!order) { sendError(res, 'Order not found', 404); return; }
  if (order.deliveredAt) { sendError(res, 'This order is already delivered.', 409); return; }

  const body = parsed.data;
  if (body.action === 'confirm') {
    if (order.state !== 'check') { sendError(res, 'Only district-level matches need a check.', 409); return; }
    const updated = await prisma.order.update({ where: { id: order.id }, data: { state: 'ready' } });
    await logEvent(order.userId, order.day, 'checked', { ref: order.ref, customer: order.customer });
    sendSuccess(res, updated);
    return;
  }
  const updated = await prisma.order.update({ where: { id: order.id }, data: { state: 'ready', match: 'pinned', lat: body.lat, lng: body.lng } });
  await logEvent(order.userId, order.day, 'pinned', { ref: order.ref, customer: order.customer });
  sendSuccess(res, updated);
};

// ── DELETE /dispatch/orders/:id ───────────────────────────────────────────────
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), userId: req.userId } });
  if (!order) { sendError(res, 'Order not found', 404); return; }
  if (order.runId) { sendError(res, 'This order is on a van. Plan the run again without it first.', 409); return; }
  await prisma.order.delete({ where: { id: order.id } });
  sendSuccess(res, { id: order.id });
};

// ── POST /dispatch/runs ── share today's orders between the vans ──────────────
const runSchema = z.object({
  depot: z.object({
    address: z.string().trim().min(3).max(300),
    lat:     z.number().min(-90).max(90).optional(),
    lng:     z.number().min(-180).max(180).optional(),
  }),
  vans:  z.array(z.object({ driver: z.string().trim().min(1).max(60), capacity: z.number().positive().max(50000) })).min(1).max(10),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});

export const planRun = async (req: AuthRequest, res: Response) => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  const userId = req.userId!;
  const country = await countryOf(userId);
  const day = dayOf(country);
  const body = parsed.data;

  // until a van has delivered something, planning again replaces today's plan;
  // after that, the new run only takes the orders that aren't on a van yet
  const runs = await prisma.run.findMany({ where: { userId, day }, include: { vans: true, orders: { select: { deliveredAt: true } } } });
  const started = runs.some(r => r.orders.some(o => o.deliveredAt));
  const orders = await prisma.order.findMany({
    where: { userId, day, state: { in: ['ready', 'check'] }, lat: { not: null }, ...(started ? { runId: null } : {}) },
    orderBy: { ref: 'asc' },
  });
  if (!orders.length) { sendError(res, 'No orders are ready for a van yet.', 422); return; }
  if (orders.length > MAX_STOPS) { sendError(res, `Up to ${MAX_STOPS} stops in one run.`, 422); return; }

  let depot = { address: body.depot.address, lat: body.depot.lat, lng: body.depot.lng };
  if (depot.lat == null || depot.lng == null) {
    const found = await normalize({ address: body.depot.address, country: country ?? undefined }).catch(() => null);
    if (!found?.geocoding) { sendError(res, 'Could not find the depot on the map. Add the district and city.', 422); return; }
    depot = { address: found.normalized_english || body.depot.address, lat: found.geocoding.latitude, lng: found.geocoding.longitude };
  }
  const at = { lat: depot.lat!, lng: depot.lng! };

  let planned: Awaited<ReturnType<typeof plan>>;
  try {
    planned = await plan(at, orders.map(o => ({ lat: o.lat!, lng: o.lng!, weight: o.kg, service: STOP_MINUTES })),
      body.vans.map((v, i) => ({ id: String(i), capacity_weight: v.capacity })));
  } catch (err) {
    console.error('[dispatch] plan', err);
    sendError(res, 'The routing service is not responding. Please try again in a minute.', 502);
    return;
  }
  const lines: [number, number][][] = [];
  for (const r of planned.routes) lines.push(await roadLine([at, ...r.legs.map(l => ({ lat: orders[l.index].lat!, lng: orders[l.index].lng! })), at]));

  const startAt = body.start ? localTime(day, body.start, country) : new Date();
  const first = started ? runs.reduce((n, r) => n + r.vans.length, 0) : 0;

  const run = await prisma.$transaction(async tx => {
    if (!started && runs.length) {
      await tx.order.updateMany({ where: { runId: { in: runs.map(r => r.id) } }, data: { seq: null, eta: null } });
      await tx.run.deleteMany({ where: { id: { in: runs.map(r => r.id) } } });
    }
    const created = await tx.run.create({
      data: {
        userId, day, depot, startAt,
        vans: { create: planned.routes.map((r, i) => ({
          index: first + i, driver: body.vans[+r.id].driver, capacity: body.vans[+r.id].capacity,
          token: randomBytes(9).toString('base64url'),
          km: Math.round(r.meters / 100) / 10, minutes: Math.round(r.minutes), load: r.w, line: lines[i],
        })) },
      },
      include: { vans: true },
    });
    for (const [i, r] of planned.routes.entries()) {
      const van = created.vans.find(v => v.index === first + i)!;
      for (const [si, l] of r.legs.entries()) {
        await tx.order.update({
          where: { id: orders[l.index].id },
          data: { runId: created.id, vanId: van.id, seq: si + 1, eta: new Date(startAt.getTime() + l.arrival * 60e3) },
        });
      }
    }
    return created;
  });

  // the sum of the vans' own rounded distances, so the activity line matches what the vans show
  const km = Math.round(run.vans.reduce((s, v) => s + v.km, 0) * 10) / 10;
  await logEvent(userId, day, 'run_planned', { vans: run.vans.length, stops: orders.length - planned.unassigned.length, km });
  sendSuccess(res, { run, unassigned: planned.unassigned.map(i => orders[i].ref) }, 201);
};
