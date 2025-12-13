import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, UserRole } from '../utils/jwt.util.js';

const ROLE_RANK: Record<UserRole, number> = { user: 1, admin: 2, superadmin: 3 };

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) return res.status(401).json({ error: 'Missing Authorization token' });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: String(payload.sub), role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}
