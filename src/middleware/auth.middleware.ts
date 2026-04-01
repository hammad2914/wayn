import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { sendError } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId    = payload.userId;
    req.userEmail = payload.email;
    req.userRole  = payload.role;
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};
