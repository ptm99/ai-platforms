const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticate = require('../middleware/auth');
const { checkPermission, requirePermission, requireOwner } = require('../services/permissions');
const { selectApiKey, updateKeyLastUsed, markKeyRateLimited, markChatPending } = require('../services/keySelector');
const { callAIProvider } = require('../services/aiProviders');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// POST /api/projects/:projectId/chats - Create new chat in project
router.post('/project/:projectId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.id;
    const projectId = req.params.projectId;
    const { title, provider_id } = req.body;

    // Check user has editor permission on project
    const permission = await requirePermission(userId, 'project', projectId, 'editor');

    if (!provider_id) {
      throw new AppError(400, 'validation_error', 'Provider ID is required');
    }

    // Select API key with lowest usage
    const apiKey = await selectApiKey(provider_id);

    // Create chat session
    const chatResult = await client.query(
      `INSERT INTO chat_sessions (project_id, owner_id, provider_id, api_key_id, title, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING id, title, status, created_at`,
      [projectId, userId, provider_id, apiKey.id, title || 'New Chat']
    );

    const chat = chatResult.rows[0];

    // Get provider name
    const providerResult = await client.query(
      'SELECT name FROM ai_providers WHERE id = $1',
      [provider_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id: chat.id,
      title: chat.title,
      provider_id: provider_id,
      provider_name: providerResult.rows[0].name,
      status: chat.status,
      created_at: chat.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// GET /api/chats/:id - Get chat details with messages
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;

    // Check permission
    const permission = await checkPermission(userId, 'chat', chatId);
    if (!permission) {
      throw new AppError(403, 'forbidden', 'You do not have access to this chat');
    }

    // Get chat details
    const chatResult = await pool.query(
      `SELECT 
        c.*,
        p.name AS provider_name,
        k.rate_limit_reset_at
       FROM chat_sessions c
       LEFT JOIN ai_providers p ON p.id = c.provider_id
       LEFT JOIN api_keys k ON k.id = c.api_key_id
       WHERE c.id = $1`,
      [chatId]
    );

    if (chatResult.rows.length === 0) {
      throw new AppError(404, 'not_found', 'Chat not found');
    }

    const chat = chatResult.rows[0];

    // Get messages
    const messagesResult = await pool.query(
      `SELECT id, role, content, token_count, created_at 
       FROM messages 
       WHERE chat_session_id = $1 
       ORDER BY created_at ASC`,
      [chatId]
    );

    res.json({
      id: chat.id,
      title: chat.title,
      provider: chat.provider_name,
      status: chat.status,
      owner_id: chat.owner_id,
      is_owner: chat.owner_id === userId,
      permission: chat.owner_id === userId ? 'owner' : permission,
      rate_limit_reset_at: chat.rate_limit_reset_at,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      messages: messagesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/chats/:id/messages - Send message to chat
router.post('/:id/messages', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.id;
    const chatId = req.params.id;
    const { content } = req.body;

    // Check user has editor permission
    await requirePermission(userId, 'chat', chatId, 'editor');

    if (!content || content.trim().length === 0) {
      throw new AppError(400, 'validation_error', 'Message content is required');
    }

    // Get chat details
    const chatResult = await client.query(
      `SELECT 
        c.*,
        p.name AS provider_name,
        k.key_value,
        k.status AS key_status,
        k.rate_limit_reset_at
       FROM chat_sessions c
       LEFT JOIN ai_providers p ON p.id = c.provider_id
       LEFT JOIN api_keys k ON k.id = c.api_key_id
       WHERE c.id = $1`,
      [chatId]
    );

    const chat = chatResult.rows[0];

    // Check if chat is pending due to rate limit
    if (chat.status === 'pending_rate_limit') {
      // Check if rate limit has been reset
      if (chat.rate_limit_reset_at && new Date(chat.rate_limit_reset_at) <= new Date()) {
        // Reset key and chat status
        await client.query(
          `UPDATE api_keys 
           SET status = 'active', rate_limit_reset_at = NULL 
           WHERE id = $1`,
          [chat.api_key_id]
        );
        await client.query(
          `UPDATE chat_sessions 
           SET status = 'active' 
           WHERE id = $1`,
          [chatId]
        );
      } else {
        // Still rate limited
        await client.query('ROLLBACK');
        return res.status(429).json({
          error: 'rate_limited',
          message: 'This chat is currently rate limited. Please try again later.',
          chat_status: 'pending_rate_limit',
          rate_limit_reset_at: chat.rate_limit_reset_at
        });
      }
    }

    // Save user message
    await client.query(
      `INSERT INTO messages (chat_session_id, role, content) 
       VALUES ($1, 'user', $2)`,
      [chatId, content]
    );

    // Get all messages for context
    const messagesResult = await client.query(
      `SELECT role, content 
       FROM messages 
       WHERE chat_session_id = $1 
       ORDER BY created_at ASC`,
      [chatId]
    );

    const messages = messagesResult.rows;

    // Call AI provider
    let aiResponse;
    try {
      aiResponse = await callAIProvider(chat.provider_name, chat.key_value, messages);
      
      // Update last used timestamp
      await updateKeyLastUsed(chat.api_key_id);

    } catch (error) {
      if (error.error === 'rate_limited') {
        // Mark key as rate limited
        await markKeyRateLimited(chat.api_key_id, error.details.resetAt);
        
        // Mark chat as pending
        await markChatPending(chatId);
        
        await client.query('COMMIT');
        
        return res.status(429).json({
          error: 'rate_limited',
          message: 'API rate limit exceeded. This chat will be available again later.',
          chat_status: 'pending_rate_limit',
          rate_limit_reset_at: error.details.resetAt
        });
      }
      throw error;
    }

    // Save assistant message
    const assistantResult = await client.query(
      `INSERT INTO messages (chat_session_id, role, content, token_count) 
       VALUES ($1, 'assistant', $2, $3) 
       RETURNING id, role, content, token_count, created_at`,
      [chatId, aiResponse.content, aiResponse.tokenCount]
    );

    // Update chat updated_at
    await client.query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [chatId]
    );

    await client.query('COMMIT');

    res.json({
      message: assistantResult.rows[0],
      chat_status: 'active'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// DELETE /api/chats/:id - Delete chat (owner only)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;

    // Check owner permission
    await requireOwner(userId, 'chat', chatId);

    await pool.query('DELETE FROM chat_sessions WHERE id = $1', [chatId]);

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;