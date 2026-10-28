import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { driverRun, markDelivered } from '../controllers/driver.controller';

const router = Router();

// the driver's link has no sign-in, so a tighter limit per phone
router.use(rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));
router.get('/:token',             driverRun);
router.post('/:token/orders/:id', markDelivered);

export default router;
