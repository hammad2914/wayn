import { Router } from 'express';
import { getUsage, incrementUsage, getHistory, getActivity } from '../controllers/usage.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/',           getUsage);
router.post('/increment', incrementUsage);
router.get('/history',    getHistory);
router.get('/activity',   getActivity);

export default router;
