import { Router, RequestHandler } from 'express';
import { authRequired } from '../../middleware/auth.middleware.js';
import * as ProjectService from '../projects/project.service.js';
import * as MessageService from './message.service.js';

export const messageRouter = Router();
messageRouter.use(authRequired);

// GET /messages/:projectId
messageRouter.get('/:projectId', (async (req, res) => {
  const canRead = await ProjectService.userCanReadProject(req.user!.id, req.params.projectId);
  if (!canRead) return res.status(403).json({ error: 'Forbidden' });
  res.json(await MessageService.listMessages(req.params.projectId));
}) as RequestHandler);

// POST /messages/:projectId/send {text}
messageRouter.post('/:projectId/send', (async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });

  const canEdit = await ProjectService.userCanEditProject(req.user!.id, req.params.projectId);
  if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

  try {
    const out = await MessageService.sendMessageOnce(req.params.projectId, req.user!.id, String(text));
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}) as RequestHandler);

// GET /messages/:projectId/stream?text=...
messageRouter.get('/:projectId/stream', (async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text : '';
  if (!text) return res.status(400).json({ error: 'text query required' });

  const canEdit = await ProjectService.userCanEditProject(req.user!.id, req.params.projectId);
  if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: string) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data.replace(/\n/g, '\\n')}\n\n`);
  };

  send('meta', JSON.stringify({ projectId: req.params.projectId }));

  try {
    for await (const delta of MessageService.sendMessageStream(req.params.projectId, req.user!.id, text)) {
      send('delta', delta);
    }
    send('done', '');
    res.end();
  } catch (e: any) {
    send('error', e.message || 'stream error');
    res.end();
  }
}) as RequestHandler);
