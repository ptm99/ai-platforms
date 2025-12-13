import { Router, RequestHandler } from 'express';
import { adminListKeys, adminCreateKey, adminUpdateKey, adminDeleteKey } from './keys.admin.service.js';

export const adminKeysRouter = Router();

adminKeysRouter.get('/', (async (req, res) => {
  const modelId = typeof req.query.model_id === 'string' ? req.query.model_id : undefined;
  res.json(await adminListKeys(modelId));
}) as RequestHandler);

adminKeysRouter.post('/', (async (req, res) => {
  const { provider_id, model_id, name, api_key_plain, daily_limit } = req.body || {};
  if (!provider_id || !model_id || !api_key_plain) return res.status(400).json({ error: 'provider_id, model_id, api_key_plain required' });
  const lim = typeof daily_limit === 'number' ? daily_limit : (typeof daily_limit === 'string' && daily_limit.trim() ? parseInt(daily_limit, 10) : undefined);
  res.status(201).json(await adminCreateKey({ provider_id: String(provider_id), model_id: String(model_id), name: name ? String(name) : undefined, api_key_plain: String(api_key_plain), daily_limit: (typeof lim === 'number' && Number.isFinite(lim)) ? lim : undefined }));
}) as RequestHandler);

adminKeysRouter.patch('/:id', (async (req, res) => {
  const row = await adminUpdateKey(req.params.id, req.body || {});
  if (!row) return res.status(404).json({ error: 'Key not found' });
  res.json(row);
}) as RequestHandler);

adminKeysRouter.delete('/:id', (async (req, res) => {
  await adminDeleteKey(req.params.id);
  res.json({ success: true });
}) as RequestHandler);
