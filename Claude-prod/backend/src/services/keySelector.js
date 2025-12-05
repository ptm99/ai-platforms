const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Select API key with lowest usage count for a provider
const selectApiKey = async (providerId) => {
  const result = await pool.query(
    `SELECT id, key_value 
     FROM api_keys 
     WHERE provider_id = $1 AND status = 'active'
     ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
     LIMIT 1`,
    [providerId]
  );

  if (result.rows.length === 0) {
    throw new AppError(503, 'no_available_keys', 'No available API keys for this provider');
  }

  const key = result.rows[0];

  // Increment usage count
  await pool.query(
    `UPDATE api_keys 
     SET usage_count = usage_count + 1 
     WHERE id = $1`,
    [key.id]
  );

  return key;
};

// Update API key last used timestamp
const updateKeyLastUsed = async (keyId) => {
  await pool.query(
    `UPDATE api_keys 
     SET last_used_at = NOW() 
     WHERE id = $1`,
    [keyId]
  );
};

// Mark key as rate limited
const markKeyRateLimited = async (keyId, resetAt) => {
  await pool.query(
    `UPDATE api_keys 
     SET status = 'rate_limited', 
         rate_limit_reset_at = $1 
     WHERE id = $2`,
    [resetAt, keyId]
  );
};

// Mark chat as pending due to rate limit
const markChatPending = async (chatId) => {
  await pool.query(
    `UPDATE chat_sessions 
     SET status = 'pending_rate_limit' 
     WHERE id = $1`,
    [chatId]
  );
};

module.exports = {
  selectApiKey,
  updateKeyLastUsed,
  markKeyRateLimited,
  markChatPending
};