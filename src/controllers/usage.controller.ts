import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response.utils';
import type { AuthRequest } from '../middleware/auth.middleware';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Upsert today's DailyUsage row and create an Activity log entry */
async function logActivity(
  userId: string,
  service: 'address_normalizer' | 'route_optimizer',
  summary?: string,
) {
  const date = todayStr();
  const dailyField = service === 'address_normalizer'
    ? { normalizer: { increment: 1 } }
    : { optimizer:  { increment: 1 } };

  await Promise.all([
    // increment or create today's DailyUsage
    prisma.dailyUsage.upsert({
      where:  { userId_date: { userId, date } },
      update: dailyField,
      create: {
        userId,
        date,
        normalizer: service === 'address_normalizer' ? 1 : 0,
        optimizer:  service === 'route_optimizer'    ? 1 : 0,
      },
    }),
    // create Activity record
    prisma.activity.create({
      data: { userId, service, summary: summary || null },
    }),
  ]);
}

// ── GET /usage ─────────────────────────────────────────────────────────────────
export const getUsage = async (req: AuthRequest, res: Response) => {
  const usage = await prisma.usage.findUnique({ where: { userId: req.userId } });
  if (!usage) { sendError(res, 'Usage record not found', 404); return; }
  sendSuccess(res, usage);
};

// ── POST /usage/increment ──────────────────────────────────────────────────────
export const incrementUsage = async (req: AuthRequest, res: Response) => {
  const { service, summary } = req.body as {
    service: 'address_normalizer' | 'route_optimizer';
    summary?: string;
  };
  if (!service) { sendError(res, 'service is required'); return; }

  const usage = await prisma.usage.findUnique({ where: { userId: req.userId } });
  if (!usage) { sendError(res, 'Usage record not found', 404); return; }

  if (service === 'address_normalizer') {
    if (usage.addressNormalizerCount >= usage.addressNormalizerLimit) {
      sendError(res, 'Address normalizer limit reached', 403, { limitReached: true, service });
      return;
    }
    const [updated] = await Promise.all([
      prisma.usage.update({
        where: { userId: req.userId },
        data:  { addressNormalizerCount: { increment: 1 } },
      }),
      logActivity(req.userId!, service, summary),
    ]);
    sendSuccess(res, updated);
  } else {
    if (usage.routeOptimizerCount >= usage.routeOptimizerLimit) {
      sendError(res, 'Route optimizer limit reached', 403, { limitReached: true, service });
      return;
    }
    const [updated] = await Promise.all([
      prisma.usage.update({
        where: { userId: req.userId },
        data:  { routeOptimizerCount: { increment: 1 } },
      }),
      logActivity(req.userId!, service, summary),
    ]);
    sendSuccess(res, updated);
  }
};

// ── GET /usage/history — last 7 calendar days ─────────────────────────────────
export const getHistory = async (req: AuthRequest, res: Response) => {
  // Build the last 7 dates (today inclusive)
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const rows = await prisma.dailyUsage.findMany({
    where: { userId: req.userId, date: { in: dates } },
    select: { date: true, normalizer: true, optimizer: true },
  });

  // Fill missing dates with 0
  const map = new Map(rows.map(r => [r.date, r]));
  const history = dates.map(date => {
    const r = map.get(date);
    return {
      date,
      day: new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
      normalizer: r?.normalizer ?? 0,
      optimizer:  r?.optimizer  ?? 0,
    };
  });

  sendSuccess(res, history);
};

// ── GET /usage/activity — last 15 API calls ───────────────────────────────────
export const getActivity = async (req: AuthRequest, res: Response) => {
  const activities = await prisma.activity.findMany({
    where:   { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take:    15,
    select:  { id: true, service: true, summary: true, createdAt: true },
  });
  sendSuccess(res, activities);
};
