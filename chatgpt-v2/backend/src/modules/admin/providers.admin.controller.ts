import { Router, RequestHandler } from 'express';
import { adminListProviders, adminCreateProvider, adminUpdateProvider, adminDeleteProvider } from './providers.admin.service.js';

export const adminProvidersRouter = Router();

adminProvidersRouter.get('/', (async (_req, res) => {
  res.json(await adminListProviders());
}) as RequestHandler);

adminProvidersRouter.post('/', (async (req, res) => {
  const { code, display_name, adapter_file, description } = req.body || {};
  if (!code || !display_name || !adapter_file) return res.status(400).json({ error: 'code, display_name, adapter_file are required' });
  res.status(201).json(await adminCreateProvider({
    code: String(code),
    display_name: String(display_name),
    adapter_file: String(adapter_file),
    description: description ? String(description) : undefined
  }));
}) as RequestHandler);

adminProvidersRouter.patch('/:id', (async (req, res) => {
  const row = await adminUpdateProvider(req.params.id, req.body || {});
  if (!row) return res.status(404).json({ error: 'Provider not found' });
  res.json(row);
}) as RequestHandler);

adminProvidersRouter.delete('/:id', (async (req, res) => {
  await adminDeleteProvider(req.params.id);
  res.json({ success: true });
}) as RequestHandler);
