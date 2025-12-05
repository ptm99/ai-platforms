const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticate = require('../middleware/auth');
const { checkPermission, requirePermission, requireOwner } = require('../services/permissions');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// GET /api/projects - Get all projects owned by or shared with user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.owner_id,
        p.created_at,
        p.updated_at,
        p.owner_id = $1 AS is_owner,
        COALESCE(perm.permission_level, 'owner') AS permission,
        COUNT(c.id) AS chat_count
       FROM projects p
       LEFT JOIN permissions perm ON perm.resource_type = 'project' 
         AND perm.resource_id = p.id AND perm.user_id = $1
       LEFT JOIN chat_sessions c ON c.project_id = p.id
       WHERE p.owner_id = $1 OR perm.user_id = $1
       GROUP BY p.id, perm.permission_level
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    res.json({
      projects: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        owner_id: row.owner_id,
        is_owner: row.is_owner,
        permission: row.is_owner ? 'owner' : row.permission,
        created_at: row.created_at,
        updated_at: row.updated_at,
        chat_count: parseInt(row.chat_count)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name) {
      throw new AppError(400, 'validation_error', 'Project name is required');
    }

    const result = await pool.query(
      `INSERT INTO projects (owner_id, name, description) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, description, owner_id, created_at, updated_at`,
      [userId, name, description || null]
    );

    const project = result.rows[0];

    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      owner_id: project.owner_id,
      is_owner: true,
      permission: 'owner',
      created_at: project.created_at,
      updated_at: project.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get project details with chats
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;

    // Check permission
    const permission = await checkPermission(userId, 'project', projectId);
    if (!permission) {
      throw new AppError(403, 'forbidden', 'You do not have access to this project');
    }

    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    const project = projectResult.rows[0];

    // Get chats
    const chatsResult = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.status,
        c.created_at,
        c.updated_at,
        p.name AS provider,
        COUNT(m.id) AS message_count
       FROM chat_sessions c
       LEFT JOIN ai_providers p ON p.id = c.provider_id
       LEFT JOIN messages m ON m.chat_session_id = c.id
       WHERE c.project_id = $1
       GROUP BY c.id, p.name
       ORDER BY c.updated_at DESC`,
      [projectId]
    );

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      owner_id: project.owner_id,
      is_owner: project.owner_id === userId,
      permission: project.owner_id === userId ? 'owner' : permission,
      created_at: project.created_at,
      updated_at: project.updated_at,
      chats: chatsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        provider: row.provider,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        message_count: parseInt(row.message_count)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - Update project (owner only)
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;
    const { name, description } = req.body;

    // Check owner permission
    await requireOwner(userId, 'project', projectId);

    if (!name) {
      throw new AppError(400, 'validation_error', 'Project name is required');
    }

    const result = await pool.query(
      `UPDATE projects 
       SET name = $1, description = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [name, description, projectId]
    );

    const project = result.rows[0];

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      owner_id: project.owner_id,
      is_owner: true,
      permission: 'owner',
      created_at: project.created_at,
      updated_at: project.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete project (owner only)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.id;

    // Check owner permission
    await requireOwner(userId, 'project', projectId);

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;