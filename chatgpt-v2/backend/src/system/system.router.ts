import { Router, RequestHandler } from 'express';
import { authRequired, requireRole } from '../middleware/auth.middleware.js';
import { checkDb, checkProviders, checkKeys } from './healthCheck.service.js';

export const systemRouter = Router();

systemRouter.get('/health', (async (_req, res) => {
  res.json({ ok: true });
}) as RequestHandler);

systemRouter.get('/status', authRequired, requireRole('admin'), (async (_req, res) => {
  const db = await checkDb();
  const providers = await checkProviders();
  const keys = await checkKeys();
  res.json({ db, providers, keys });
}) as RequestHandler);
