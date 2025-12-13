import { Router } from 'express';
import { authRequired, requireRole } from '../../middleware/auth.middleware.js';
import { adminProvidersRouter } from './providers.admin.controller.js';
import { adminModelsRouter } from './models.admin.controller.js';
import { adminKeysRouter } from './keys.admin.controller.js';

export const adminRouter = Router();

adminRouter.use(authRequired);
adminRouter.use(requireRole('admin'));

adminRouter.use('/providers', adminProvidersRouter);
adminRouter.use('/models', adminModelsRouter);
adminRouter.use('/keys', adminKeysRouter);
