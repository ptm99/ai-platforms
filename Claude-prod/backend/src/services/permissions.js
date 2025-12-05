const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Check user's permission level for a resource
// Returns: 'owner', 'editor', 'read_only', or null
const checkPermission = async (userId, resourceType, resourceId) => {
  // Check if user is the owner
  if (resourceType === 'project') {
    const result = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [resourceId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'not_found', 'Project not found');
    }
    if (result.rows[0].owner_id === userId) {
      return 'owner';
    }
  } else if (resourceType === 'chat') {
    const result = await pool.query(
      'SELECT owner_id, project_id FROM chat_sessions WHERE id = $1',
      [resourceId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'not_found', 'Chat not found');
    }
    const chat = result.rows[0];
    
    // Check if user owns the chat
    if (chat.owner_id === userId) {
      return 'owner';
    }
    
    // Check if user owns the project
    const projectResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [chat.project_id]
    );
    if (projectResult.rows[0].owner_id === userId) {
      return 'owner';
    }
    
    // Check project permissions (inherit from project)
    const projectPerm = await checkPermission(userId, 'project', chat.project_id);
    if (projectPerm) {
      return projectPerm;
    }
  }

  // Check permissions table
  const permResult = await pool.query(
    `SELECT permission_level 
     FROM permissions 
     WHERE user_id = $1 AND resource_type = $2 AND resource_id = $3`,
    [userId, resourceType, resourceId]
  );

  if (permResult.rows.length > 0) {
    return permResult.rows[0].permission_level;
  }

  return null; // No access
};

// Require specific permission level or throw error
const requirePermission = async (userId, resourceType, resourceId, minLevel = 'read_only') => {
  const permission = await checkPermission(userId, resourceType, resourceId);
  
  if (!permission) {
    throw new AppError(403, 'forbidden', 'You do not have access to this resource');
  }

  const levels = { 'read_only': 1, 'editor': 2, 'owner': 3 };
  
  if (levels[permission] < levels[minLevel]) {
    throw new AppError(403, 'forbidden', `You need ${minLevel} permission for this action`);
  }

  return permission;
};

// Require owner permission
const requireOwner = async (userId, resourceType, resourceId) => {
  const permission = await checkPermission(userId, resourceType, resourceId);
  
  if (permission !== 'owner') {
    throw new AppError(403, 'forbidden', 'Only the owner can perform this action');
  }
};

module.exports = {
  checkPermission,
  requirePermission,
  requireOwner
};