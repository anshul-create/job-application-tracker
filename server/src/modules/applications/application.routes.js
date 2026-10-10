import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { createApplicationSchema } from './application.schema.js';
import { create } from './application.controller.js';

const router = Router();

// All application routes require authentication
router.use(authenticate);

// POST /api/v1/applications
router.post('/', validate(createApplicationSchema), create);

export default router;
