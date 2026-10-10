import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { register, login, me, logout } from './auth.controller.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), register);

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/v1/auth/logout
router.post('/logout', logout);

// GET /api/v1/auth/me
router.get('/me', authenticate, me);

export default router;
