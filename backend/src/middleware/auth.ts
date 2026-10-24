import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthUser { userId: string; phone: string }
declare global { namespace Express { interface Request { auth?: AuthUser } } }

export const requireAuth: RequestHandler = (req, res, next) => {
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!match) { res.status(401).json({ error: 'Authentication required' }); return; }
  try {
    const decoded = jwt.verify(match[1]!, config.jwtSecret) as JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.phone !== 'string') throw new Error('Invalid token');
    req.auth = { userId: decoded.sub, phone: decoded.phone };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
};
