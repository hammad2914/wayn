import { Router } from 'express';
import { today, addOrders, updateOrder, deleteOrder, planRun } from '../controllers/dispatch.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/today',         today);
router.post('/orders',       addOrders);
router.patch('/orders/:id',  updateOrder);
router.delete('/orders/:id', deleteOrder);
router.post('/runs',         planRun);

export default router;
