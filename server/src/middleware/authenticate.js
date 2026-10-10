import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Reads the JWT from the HttpOnly cookie `token`, verifies it, and attaches
 * `req.userId` (string) for downstream handlers.
 */
export function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required.', details: [] },
    });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid or expired.', details: [] },
    });
  }
}
