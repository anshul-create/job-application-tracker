import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { createInterviewSchema, updateInterviewSchema } from './interview.schema.js';
import { create, list, update, remove } from './interview.controller.js';

// Nested under /api/v1/applications/:applicationId
const applicationInterviewRouter = Router();
applicationInterviewRouter.use(authenticate);

applicationInterviewRouter.post('/:applicationId/interviews', validate(createInterviewSchema), create);
applicationInterviewRouter.get('/:applicationId/interviews', list);

// Top-level /api/v1/interviews/:interviewId
const interviewRouter = Router();
interviewRouter.use(authenticate);

interviewRouter.patch('/:interviewId', validate(updateInterviewSchema), update);
interviewRouter.delete('/:interviewId', remove);

export { applicationInterviewRouter, interviewRouter };
