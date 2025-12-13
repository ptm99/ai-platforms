import { pool } from '../../db/pool.js';
import { encrypt } from '../../utils/crypto.util.js';

const VALID_STATUS = new Set(['active','exhausted','disabled']);

export async function adminListKeys(modelId?: string) {
  const res = modelId
    ? await pool.query(`SELECT id, provider_id, model_id, name, status, daily_limit, daily_usage, last_used_at, created_at FROM ai_provider_keys WHERE model_id=$1 ORDER BY created_at DESC`, [modelId])
    : await pool.query(`SELECT id, provider_id, model_id, name, status, daily_limit, daily_usage, last_used_at, created_at FROM ai_provider_keys ORDER BY created_at DESC`);
  return res.rows;
}

export async function adminCreateKey(input: { provider_id: string; model_id: string; name?: string; api_key_plain: string; daily_limit?: number }) {
  if (input.daily_limit !== undefined && input.daily_limit < 0) throw new Error('daily_limit must be >= 0');
  const api_key_enc = encrypt(input.api_key_plain);
  const res = await pool.query(
    `INSERT INTO ai_provider_keys (provider_id, model_id, api_key_enc, name, daily_limit) VALUES ($1,$2,$3,$4,COALESCE($5, daily_limit))
     RETURNING id, provider_id, model_id, name, status, daily_limit, daily_usage, last_used_at, created_at`,
    [input.provider_id, input.model_id, api_key_enc, input.name ?? null, input.daily_limit ?? null]
  );
  return res.rows[0];
}

export async function adminUpdateKey(keyId: string, patch: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (typeof patch.status === 'string') {
    const s = patch.status.trim();
    if (!VALID_STATUS.has(s)) throw new Error('Invalid status');
    fields.push(`status=$${i++}`); values.push(s);
  }
  if (typeof patch.daily_limit === 'number') {
    if (patch.daily_limit < 0) throw new Error('daily_limit must be >= 0');
    fields.push(`daily_limit=$${i++}`); values.push(patch.daily_limit);
  }
  if (!fields.length) throw new Error('No fields to update');
  values.push(keyId);

  const res = await pool.query(
    `UPDATE ai_provider_keys SET ${fields.join(', ')} WHERE id=$${i}
     RETURNING id, provider_id, model_id, name, status, daily_limit, daily_usage, last_used_at, created_at`,
    values
  );
  return res.rows[0] ?? null;
}

export async function adminDeleteKey(keyId: string) {
  await pool.query(`DELETE FROM ai_provider_keys WHERE id=$1`, [keyId]);
}
