import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import { createApplicationSchema, listApplicationsSchema, updateApplicationSchema } from './application.schema.js';
import { create, list, getOne, update, remove } from './application.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/applications
router.post('/', validate(createApplicationSchema), create);

// GET /api/v1/applications
router.get('/', validateQuery(listApplicationsSchema), list);

// GET /api/v1/applications/:applicationId
router.get('/:applicationId', getOne);

// PATCH /api/v1/applications/:applicationId
router.patch('/:applicationId', validate(updateApplicationSchema), update);

// DELETE /api/v1/applications/:applicationId
router.delete('/:applicationId', remove);

export default router;
