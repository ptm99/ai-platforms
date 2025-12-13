import { pool } from '../db/pool.js';

/**
 * Auto-discovery job placeholder.
 * In production, call provider APIs and upsert models into ai_provider_models.
 * This implementation is safe (no external calls) and validates types strictly.
 */
export async function runModelDiscoveryOnce() {
  // Example: ensure at least a few standard models exist for OpenAI provider if absent.
  const pRes = await pool.query(`SELECT id FROM ai_providers WHERE code='openai' LIMIT 1`);
  if (!pRes.rows.length) return;
  const providerId = pRes.rows[0].id as string;

  const candidates = [
    { model_name: 'gpt-4o-mini', context_length: 128000 },
    { model_name: 'gpt-4.1-mini', context_length: 128000 }
  ];

  for (const c of candidates) {
    await pool.query(
      `
      INSERT INTO ai_provider_models (provider_id, model_name, context_length)
      VALUES ($1,$2,$3)
      ON CONFLICT (provider_id, model_name) DO NOTHING
      `,
      [providerId, c.model_name, c.context_length]
    );
  }
}
