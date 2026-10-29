import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { normalizeAddress, optimizeRoute, tryAddress } from '../controllers/engine.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// both lean on free public map services, so keep each user well within their limits
const engineLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { success: false, error: 'Too many requests, wait a minute.' } });

// the landing page's try-it box: no account, so a few tries per visitor and a cap for the whole site,
// which keeps the free map services' limits safe however many people find the page
const tryPerVisitor = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'try_limit' } });
const tryPerDay = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 300, keyGenerator: () => 'everyone',
  message: { success: false, error: 'try_busy' } });
router.post('/try', tryPerVisitor, tryPerDay, tryAddress);

router.use(requireAuth, engineLimiter);
router.post('/normalize',      normalizeAddress);
router.post('/optimize-route', optimizeRoute);

export default router;
