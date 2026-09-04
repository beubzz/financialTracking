import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AuthenticatedRequest = Request & { userId?: string };

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== 'object' || !payload.sub) throw new Error('Invalid token');
    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
}
