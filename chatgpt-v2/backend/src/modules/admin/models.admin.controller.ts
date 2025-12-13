import { Router, RequestHandler } from 'express';
import { adminListModels, adminCreateModel, adminUpdateModel, adminDeleteModel } from './models.admin.service.js';

export const adminModelsRouter = Router();

adminModelsRouter.get('/', (async (req, res) => {
  const providerId = typeof req.query.provider_id === 'string' ? req.query.provider_id : undefined;
  res.json(await adminListModels(providerId));
}) as RequestHandler);

adminModelsRouter.post('/', (async (req, res) => {
  const { provider_id, model_name, context_length } = req.body || {};
  if (!provider_id || !model_name) return res.status(400).json({ error: 'provider_id and model_name are required' });
  const ctx = typeof context_length === 'number' ? context_length : (typeof context_length === 'string' && context_length.trim() ? parseInt(context_length, 10) : null);
  res.status(201).json(await adminCreateModel({ provider_id: String(provider_id), model_name: String(model_name), context_length: Number.isFinite(ctx as any) ? (ctx as number) : null }));
}) as RequestHandler);

adminModelsRouter.patch('/:id', (async (req, res) => {
  const row = await adminUpdateModel(req.params.id, req.body || {});
  if (!row) return res.status(404).json({ error: 'Model not found' });
  res.json(row);
}) as RequestHandler);

adminModelsRouter.delete('/:id', (async (req, res) => {
  await adminDeleteModel(req.params.id);
  res.json({ success: true });
}) as RequestHandler);
