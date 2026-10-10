import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { summary } from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/dashboard/summary
router.get('/summary', summary);

export default router;
