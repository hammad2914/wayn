import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.middleware';
import { normalize } from '../services/normalize.service';
import { optimize, RouteInputError } from '../services/route.service';

// These two return the response shape the dashboard pages already read,
// so they answer with the body directly rather than through sendSuccess.

const country = z.string().length(2);

const normalizeSchema = z.object({
  address:           z.string().trim().min(3).max(300),
  country:           country.optional(),
  include_geocoding: z.boolean().optional(),
});

const routeSchema = z.object({
  country:                country,
  city:                   z.string().max(80).optional(),
  optimization_objective: z.enum(['distance', 'time']).optional(),
  depot:                  z.object({ address: z.string().trim().min(3).max(300) }),
  stops: z.array(z.object({
    address:       z.string().trim().min(3).max(300),
    demand_weight: z.number().min(0).optional(),
    demand_volume: z.number().min(0).optional(),
    service_time:  z.number().min(0).max(600).optional(),
  })).min(1).max(40),
  vehicles: z.array(z.object({
    id:              z.string().min(1).max(40),
    capacity_weight: z.number().positive().optional(),
    capacity_volume: z.number().positive().optional(),
  })).min(1).max(10),
});

const invalid = (res: Response, error: z.ZodError) =>
  res.status(400).json({ success: false, error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });

export const normalizeAddress = async (req: AuthRequest, res: Response) => {
  const parsed = normalizeSchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try {
    res.json(await normalize(parsed.data));
  } catch (err) {
    console.error('[normalize]', err);
    res.status(502).json({ success: false, error: 'The map service is not responding. Please try again in a minute.' });
  }
};

// one address from a visitor who isn't signed in: shorter input, and only what the box shows
const trySchema = z.object({ address: z.string().trim().min(3).max(160), country: country.optional() });

export const tryAddress = async (req: AuthRequest, res: Response) => {
  const parsed = trySchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try {
    const r = await normalize(parsed.data);
    res.json({
      success: r.success, original_address: r.original_address, normalized_english: r.normalized_english,
      normalized_address: r.normalized_address, components: r.components, confidence_score: r.confidence_score,
      geocoding: r.geocoding, processing_time_ms: r.processing_time_ms, error: r.error,
    });
  } catch (err) {
    console.error('[try]', err);
    res.status(502).json({ success: false, error: 'The map service is not responding. Please try again in a minute.' });
  }
};

export const optimizeRoute = async (req: AuthRequest, res: Response) => {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) { invalid(res, parsed.error); return; }
  try {
    res.json(await optimize(parsed.data));
  } catch (err) {
    if (err instanceof RouteInputError) { res.status(422).json({ success: false, error: err.message }); return; }
    console.error('[optimize]', err);
    res.status(502).json({ success: false, error: 'The routing service is not responding. Please try again in a minute.' });
  }
};
