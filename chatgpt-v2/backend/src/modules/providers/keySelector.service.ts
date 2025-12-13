import { pool } from '../../db/pool.js';

export interface ProviderKeyRow {
  id: string;
  provider_id: string;
  model_id: string;
  api_key_enc: string;
  status: 'active'|'exhausted'|'disabled';
  daily_limit: number;
  daily_usage: number;
  last_used_at: string | null;
}

export async function selectKeyForModel(modelId: string): Promise<ProviderKeyRow> {
  const res = await pool.query(
    `
    SELECT *
    FROM ai_provider_keys
    WHERE model_id = $1
      AND status = 'active'
      AND daily_usage < daily_limit
    ORDER BY daily_usage ASC, last_used_at NULLS FIRST
    LIMIT 1
    `,
    [modelId]
  );

  if (!res.rows.length) {
    throw new Error('No key available for this model');
  }

  return res.rows[0];
}

export async function recordKeyUsage(keyId: string, tokensIn: number, tokensOut: number) {
  await pool.query(
    `
    UPDATE ai_provider_keys
    SET daily_usage = daily_usage + $2 + $3,
        last_used_at = NOW()
    WHERE id = $1
    `,
    [keyId, Math.max(tokensIn, 0), Math.max(tokensOut, 0)]
  );
}
