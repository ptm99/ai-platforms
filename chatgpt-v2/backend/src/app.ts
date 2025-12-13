import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';

import { authRouter } from './modules/auth/auth.controller.js';
import { projectRouter } from './modules/projects/project.controller.js';
import { messageRouter } from './modules/messages/message.controller.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { systemRouter } from './system/system.router.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(bodyParser.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/projects', projectRouter);
  app.use('/messages', messageRouter);
  app.use('/admin', adminRouter);
  app.use('/system', systemRouter);

  // global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[express]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
