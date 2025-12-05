const pool = require('../config/database');

// Background job to reset rate-limited API keys
const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset keys that have passed their reset time
    const keysResult = await client.query(
      `UPDATE api_keys 
       SET status = 'active', 
           rate_limit_reset_at = NULL,
           updated_at = NOW()
       WHERE status = 'rate_limited' 
         AND rate_limit_reset_at IS NOT NULL
         AND rate_limit_reset_at <= NOW()
       RETURNING id`,
      []
    );

    const resetKeyCount = keysResult.rows.length;

    if (resetKeyCount > 0) {
      console.log(`Reset ${resetKeyCount} API key(s) from rate limit`);

      // Get the IDs of reset keys
      const resetKeyIds = keysResult.rows.map(row => row.id);

      // Reset chat sessions that use these keys
      const chatsResult = await client.query(
        `UPDATE chat_sessions 
         SET status = 'active',
             updated_at = NOW()
         WHERE status = 'pending_rate_limit'
           AND api_key_id = ANY($1)
         RETURNING id`,
        [resetKeyIds]
      );

      const resetChatCount = chatsResult.rows.length;
      console.log(`Reset ${resetChatCount} chat session(s) from pending status`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in rate limit reset job:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { run };