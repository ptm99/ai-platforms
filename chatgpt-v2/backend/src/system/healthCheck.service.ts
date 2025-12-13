import { pool } from '../db/pool.js';

export async function checkDb() {
  const res = await pool.query('SELECT 1 as ok');
  return res.rows[0]?.ok === 1;
}

export async function checkProviders() {
  const res = await pool.query('SELECT code, is_enabled FROM ai_providers ORDER BY code');
  return res.rows as Array<{ code: string; is_enabled: boolean }>;
}

export async function checkKeys() {
  const res = await pool.query(
    `SELECT id, status, daily_usage, daily_limit FROM ai_provider_keys ORDER BY created_at DESC LIMIT 50`
  );
  return res.rows as Array<{ id: string; status: string; daily_usage: number; daily_limit: number }>;
}
