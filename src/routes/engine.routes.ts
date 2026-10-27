import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { normalizeAddress, optimizeRoute } from '../controllers/engine.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// both lean on free public map services, so keep each user well within their limits
const engineLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { success: false, error: 'Too many requests, wait a minute.' } });

router.use(requireAuth, engineLimiter);
router.post('/normalize',      normalizeAddress);
router.post('/optimize-route', optimizeRoute);

export default router;
