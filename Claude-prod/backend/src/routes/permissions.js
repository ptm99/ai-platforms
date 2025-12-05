const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticate = require('../middleware/auth');
const { requireOwner } = require('../services/permissions');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// POST /api/permissions/project/:projectId/share - Share a project
router.post('/project/:projectId/share', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.projectId;
    const { username, permission_level } = req.body;

    // Check owner permission
    await requireOwner(userId, 'project', projectId);

    if (!username || !permission_level) {
      throw new AppError(400, 'validation_error', 'Username and permission level are required');
    }

    if (!['read_only', 'editor'].includes(permission_level)) {
      throw new AppError(400, 'validation_error', 'Permission level must be read_only or editor');
    }

    // Look up user by username
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new AppError(404, 'not_found', 'User not found');
    }

    const targetUserId = userResult.rows[0].id;

    if (targetUserId === userId) {
      throw new AppError(400, 'validation_error', 'Cannot share with yourself');
    }

    // Insert or update permission
    await pool.query(
      `INSERT INTO permissions (user_id, resource_type, resource_id, permission_level, granted_by) 
       VALUES ($1, 'project', $2, $3, $4)
       ON CONFLICT (user_id, resource_type, resource_id) 
       DO UPDATE SET permission_level = $3, granted_by = $4`,
      [targetUserId, projectId, permission_level, userId]
    );

    res.status(201).json({
      message: 'Project shared successfully',
      user_id: targetUserId,
      username: username,
      permission_level: permission_level
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/permissions/project/:projectId - List project permissions
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.projectId;

    // Check owner permission
    await requireOwner(userId, 'project', projectId);

    const result = await pool.query(
      `SELECT 
        p.user_id,
        u.username,
        p.permission_level,
        p.created_at
       FROM permissions p
       JOIN users u ON u.id = p.user_id
       WHERE p.resource_type = 'project' AND p.resource_id = $1
       ORDER BY p.created_at DESC`,
      [projectId]
    );

    res.json({
      permissions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/permissions/project/:projectId/user/:targetUserId - Revoke project access
router.delete('/project/:projectId/user/:targetUserId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.projectId;
    const targetUserId = req.params.targetUserId;

    // Check owner permission
    await requireOwner(userId, 'project', projectId);

    await pool.query(
      `DELETE FROM permissions 
       WHERE user_id = $1 AND resource_type = 'project' AND resource_id = $2`,
      [targetUserId, projectId]
    );

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/permissions/chat/:chatId/share - Share a chat
router.post('/chat/:chatId/share', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;
    const { username, permission_level } = req.body;

    // Check owner permission
    await requireOwner(userId, 'chat', chatId);

    if (!username || !permission_level) {
      throw new AppError(400, 'validation_error', 'Username and permission level are required');
    }

    if (!['read_only', 'editor'].includes(permission_level)) {
      throw new AppError(400, 'validation_error', 'Permission level must be read_only or editor');
    }

    // Look up user by username
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new AppError(404, 'not_found', 'User not found');
    }

    const targetUserId = userResult.rows[0].id;

    if (targetUserId === userId) {
      throw new AppError(400, 'validation_error', 'Cannot share with yourself');
    }

    // Insert or update permission
    await pool.query(
      `INSERT INTO permissions (user_id, resource_type, resource_id, permission_level, granted_by) 
       VALUES ($1, 'chat', $2, $3, $4)
       ON CONFLICT (user_id, resource_type, resource_id) 
       DO UPDATE SET permission_level = $3, granted_by = $4`,
      [targetUserId, chatId, permission_level, userId]
    );

    res.status(201).json({
      message: 'Chat shared successfully',
      user_id: targetUserId,
      username: username,
      permission_level: permission_level
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/permissions/chat/:chatId - List chat permissions
router.get('/chat/:chatId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    // Check owner permission
    await requireOwner(userId, 'chat', chatId);

    const result = await pool.query(
      `SELECT 
        p.user_id,
        u.username,
        p.permission_level,
        p.created_at
       FROM permissions p
       JOIN users u ON u.id = p.user_id
       WHERE p.resource_type = 'chat' AND p.resource_id = $1
       ORDER BY p.created_at DESC`,
      [chatId]
    );

    res.json({
      permissions: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/permissions/chat/:chatId/user/:targetUserId - Revoke chat access
router.delete('/chat/:chatId/user/:targetUserId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.chatId;
    const targetUserId = req.params.targetUserId;

    // Check owner permission
    await requireOwner(userId, 'chat', chatId);

    await pool.query(
      `DELETE FROM permissions 
       WHERE user_id = $1 AND resource_type = 'chat' AND resource_id = $2`,
      [targetUserId, chatId]
    );

    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;