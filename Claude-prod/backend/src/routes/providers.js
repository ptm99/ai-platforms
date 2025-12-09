const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticate = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// GET /api/providers - List all AI providers
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.display_name,
        p.is_active,
        COUNT(k.id) FILTER (WHERE k.status = 'active') AS available_keys
       FROM ai_providers p
       LEFT JOIN api_keys k ON k.provider_id = p.id
       WHERE p.is_active = true
       GROUP BY p.id
       ORDER BY p.display_name`,
      []
    );

    res.json({
      providers: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        is_active: row.is_active,
        available_keys: parseInt(row.available_keys)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes for managing API keys
// All routes below require admin authentication

// POST /api/providers/keys - Add new API key (Admin only)
router.post('/keys', authenticate.requireAdmin, async (req, res, next) => {
  try {
    const { provider_id, key_value } = req.body;

    if (!provider_id || !key_value) {
      throw new AppError(400, 'validation_error', 'Provider ID and key value are required');
    }

    const result = await pool.query(
      `INSERT INTO api_keys (provider_id, key_value) 
       VALUES ($1, $2) 
       RETURNING id, provider_id, usage_count, status, created_at`,
      [provider_id, key_value]
    );

    res.status(201).json({
      message: 'API key added successfully',
      key: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/providers/keys - List all API keys (Admin only)
router.get('/keys', authenticate.requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        k.id,
        k.provider_id,
        p.display_name AS provider_name,
        SUBSTRING(k.key_value, 1, 10) || '...' AS key_preview,
        k.usage_count,
        k.last_used_at,
        k.status,
        k.rate_limit_reset_at,
        k.created_at
       FROM api_keys k
       JOIN ai_providers p ON p.id = k.provider_id
       ORDER BY p.display_name, k.created_at DESC`,
      []
    );

    res.json({
      keys: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/providers/keys/:id - Update key status (Admin only)
router.put('/keys/:id', authenticate.requireAdmin, async (req, res, next) => {
  try {
    const keyId = req.params.id;
    const { status } = req.body;

    if (!status || !['active', 'rate_limited', 'disabled'].includes(status)) {
      throw new AppError(400, 'validation_error', 'Valid status is required');
    }

    const result = await pool.query(
      `UPDATE api_keys 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, keyId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'not_found', 'API key not found');
    }

    res.json({
      message: 'API key updated successfully',
      key: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/providers/keys/:id - Delete API key (Admin only)
router.delete('/keys/:id', authenticate.requireAdmin, async (req, res, next) => {
  try {
    const keyId = req.params.id;

    await pool.query('DELETE FROM api_keys WHERE id = $1', [keyId]);

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;