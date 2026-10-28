import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response.utils';
import { logEvent } from '../services/dispatch.service';

// The driver's link: no account, the token in the link is the key to one van's stops for one day.

const findVan = (token: string) => prisma.runVan.findUnique({
  where: { token },
  include: {
    run: { select: { day: true, depot: true, startAt: true, userId: true, user: { select: { companyName: true } } } },
    orders: { orderBy: { seq: 'asc' } },
  },
});

// ── GET /driver/:token ────────────────────────────────────────────────────────
export const driverRun = async (req: Request, res: Response) => {
  const van = await findVan(String(req.params.token));
  if (!van) { sendError(res, 'This link is not valid any more. Ask your dispatcher for a new one.', 404); return; }
  sendSuccess(res, {
    company: van.run.user.companyName,
    driver:  van.driver,
    van:     van.index + 1,
    day:     van.run.day,
    depot:   van.run.depot,
    startAt: van.run.startAt,
    km:      van.km,
    stops:   van.orders.map(o => ({
      id: o.id, seq: o.seq, customer: o.customer, phone: o.phone, text: o.text, en: o.en, ar: o.ar,
      notes: o.notes, lat: o.lat, lng: o.lng, kg: o.kg, eta: o.eta, deliveredAt: o.deliveredAt,
    })),
  });
};

// ── POST /driver/:token/orders/:id ── mark a stop delivered, or undo a mistaken tap ──
const markSchema = z.object({ delivered: z.boolean() });

export const markDelivered = async (req: Request, res: Response) => {
  const parsed = markSchema.safeParse(req.body);
  if (!parsed.success) { sendError(res, 'delivered must be true or false'); return; }
  const van = await findVan(String(req.params.token));
  const order = van?.orders.find(o => o.id === req.params.id);
  if (!van || !order) { sendError(res, 'Stop not found', 404); return; }

  const deliveredAt = parsed.data.delivered ? (order.deliveredAt ?? new Date()) : null;
  await prisma.order.update({ where: { id: order.id }, data: { deliveredAt } });
  if (parsed.data.delivered && !order.deliveredAt) {
    const { userId, day } = van.run;
    await logEvent(userId, day, 'delivered', { ref: order.ref, customer: order.customer, van: van.index + 1, address: order.en ?? order.text });
    if (van.orders.every(o => o.id === order.id || o.deliveredAt)) await logEvent(userId, day, 'van_done', { van: van.index + 1, driver: van.driver });
  }
  sendSuccess(res, { id: order.id, deliveredAt });
};
