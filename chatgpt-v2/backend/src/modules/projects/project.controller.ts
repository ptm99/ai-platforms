import { Router, RequestHandler } from 'express';
import { authRequired, requireRole } from '../../middleware/auth.middleware.js';
import * as ProjectService from './project.service.js';

export const projectRouter = Router();
projectRouter.use(authRequired);

// GET /projects
projectRouter.get('/', (async (req, res) => {
  res.json(await ProjectService.listUserProjects(req.user!.id));
}) as RequestHandler);

// POST /projects
projectRouter.post('/', (async (req, res) => {
  const { title, provider_id, model_id } = req.body || {};
  if (!title || !provider_id || !model_id) return res.status(400).json({ error: 'title, provider_id and model_id are required' });

  try {
    const p = await ProjectService.createProject(req.user!.id, String(title), String(provider_id), String(model_id));
    res.status(201).json(p);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create project' });
  }
}) as RequestHandler);

// GET /projects/:id
projectRouter.get('/:id', (async (req, res) => {
  const canRead = await ProjectService.userCanReadProject(req.user!.id, req.params.id);
  if (!canRead) return res.status(403).json({ error: 'Forbidden' });

  const p = await ProjectService.getProjectById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json(p);
}) as RequestHandler);

// GET /projects/:id/members
projectRouter.get('/:id/members', (async (req, res) => {
  const canRead = await ProjectService.userCanReadProject(req.user!.id, req.params.id);
  if (!canRead) return res.status(403).json({ error: 'Forbidden' });
  res.json(await ProjectService.listProjectMembers(req.params.id));
}) as RequestHandler);

// POST /projects/:id/members {email, permission}
projectRouter.post('/:id/members', (async (req, res) => {
  const { email, permission } = req.body || {};
  if (!email || !['read','edit'].includes(permission)) {
    return res.status(400).json({ error: 'email and permission ("read"|"edit") required' });
  }

  const projectId = req.params.id;
  const isOwner = await ProjectService.userIsProjectOwner(req.user!.id, projectId);
  const isElevated = req.user!.role === 'admin' || req.user!.role === 'superadmin';
  if (!isOwner && !isElevated) return res.status(403).json({ error: 'Only owner or admin can manage members' });

  const project = await ProjectService.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const target = await ProjectService.findUserByEmail(String(email));
  if (!target) return res.status(404).json({ error: 'Target user not found' });

  if (String(target.id) === String(req.user!.id)) return res.status(400).json({ error: 'Cannot add yourself' });
  if (String(project.owner_id) === String(target.id)) return res.status(400).json({ error: 'Owner cannot be a member' });
  if (project.visibility === 'public') return res.status(400).json({ error: 'Public projects do not require collaborators' });

  await ProjectService.addOrUpdateProjectMember(projectId, target.id, permission);
  res.status(201).json(await ProjectService.listProjectMembers(projectId));
}) as RequestHandler);

// PATCH /projects/:id/members/:userId {permission}
projectRouter.patch('/:id/members/:userId', (async (req, res) => {
  const { permission } = req.body || {};
  if (!['read','edit'].includes(permission)) return res.status(400).json({ error: 'permission must be "read" or "edit"' });

  const projectId = req.params.id;
  const targetUserId = req.params.userId;

  const isOwner = await ProjectService.userIsProjectOwner(req.user!.id, projectId);
  const isElevated = req.user!.role === 'admin' || req.user!.role === 'superadmin';
  if (!isOwner && !isElevated) return res.status(403).json({ error: 'Only owner or admin can update members' });

  const project = await ProjectService.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (String(project.owner_id) === String(targetUserId)) return res.status(400).json({ error: 'Cannot modify owner' });

  const exists = await ProjectService.isUserMember(projectId, targetUserId);
  if (!exists) return res.status(404).json({ error: 'Member not found' });

  await ProjectService.addOrUpdateProjectMember(projectId, targetUserId, permission);
  res.json(await ProjectService.listProjectMembers(projectId));
}) as RequestHandler);

// DELETE /projects/:id/members/:userId
projectRouter.delete('/:id/members/:userId', (async (req, res) => {
  const projectId = req.params.id;
  const targetUserId = req.params.userId;

  const isOwner = await ProjectService.userIsProjectOwner(req.user!.id, projectId);
  const isElevated = req.user!.role === 'admin' || req.user!.role === 'superadmin';
  if (!isOwner && !isElevated) return res.status(403).json({ error: 'Only owner or admin can remove members' });

  const project = await ProjectService.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (String(project.owner_id) === String(targetUserId)) return res.status(400).json({ error: 'Cannot remove owner' });

  const exists = await ProjectService.isUserMember(projectId, targetUserId);
  if (!exists) return res.status(404).json({ error: 'Member not found' });

  await ProjectService.removeProjectMember(projectId, targetUserId);
  res.json(await ProjectService.listProjectMembers(projectId));
}) as RequestHandler);

// DELETE /projects/:id/members/me
projectRouter.delete('/:id/members/me', (async (req, res) => {
  try {
    await ProjectService.leaveProject(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}) as RequestHandler);

// PATCH /projects/:id/visibility {visibility}
projectRouter.patch('/:id/visibility', (async (req, res) => {
  const { visibility } = req.body || {};
  if (!['private','shared','public'].includes(visibility)) return res.status(400).json({ error: 'Invalid visibility' });

  const projectId = req.params.id;
  const isOwner = await ProjectService.userIsProjectOwner(req.user!.id, projectId);
  const isElevated = req.user!.role === 'admin' || req.user!.role === 'superadmin';
  if (!isOwner && !isElevated) return res.status(403).json({ error: 'Only owner or admin can change visibility' });

  try {
    const updated = await ProjectService.updateProjectVisibility(projectId, visibility);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}) as RequestHandler);

// POST /projects/:id/clone
projectRouter.post('/:id/clone', (async (req, res) => {
  const canRead = await ProjectService.userCanReadProject(req.user!.id, req.params.id);
  if (!canRead) return res.status(403).json({ error: 'Forbidden' });

  try {
    const cloned = await ProjectService.cloneProject(req.params.id, req.user!.id);
    res.status(201).json(cloned);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}) as RequestHandler);

// Admin-only: list all providers/models (optional convenience)
projectRouter.get('/_meta/providers', requireRole('admin'), (async (_req, res) => {
  const { listProviders } = await import('../providers/provider.service.js');
  res.json(await listProviders(false));
}) as RequestHandler);
