import { Router, RequestHandler } from 'express';
import { authRequired, requireRole } from '../../middleware/auth.middleware.js';
import * as AuthService from './auth.service.js';

export const authRouter = Router();

const register: RequestHandler = async (req, res) => {
  const { email, password, display_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await AuthService.register(String(email), String(password), display_name ? String(display_name) : undefined);
    res.status(201).json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'register failed' });
  }
};

const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const out = await AuthService.login(String(email), String(password), req.headers['user-agent'] as string | undefined, req.ip);
    res.json(out);
  } catch (e: any) {
    res.status(401).json({ error: e.message || 'login failed' });
  }
};

authRouter.post('/register', register);
authRouter.post('/login', login);

// superadmin user management
authRouter.get('/admin/users', authRequired, requireRole('superadmin'), (async (_req, res) => {
  res.json(await AuthService.listUsers());
}) as RequestHandler);

authRouter.patch('/admin/users/:id/role', authRequired, requireRole('superadmin'), (async (req, res) => {
  const { role } = req.body || {};
  if (!role || !['user','admin','superadmin'].includes(role)) return res.status(400).json({ error: 'invalid role' });
  const updated = await AuthService.setUserRole(req.params.id, role);
  if (!updated) return res.status(404).json({ error: 'user not found' });
  res.json(updated);
}) as RequestHandler);
