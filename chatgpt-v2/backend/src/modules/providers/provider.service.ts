import { pool } from '../../db/pool.js';

export interface ProviderRow {
  id: string;
  code: string;
  display_name: string;
  adapter_file: string;
  is_enabled: boolean;
}

export interface ModelRow {
  id: string;
  provider_id: string;
  model_name: string;
  context_length: number | null;
  is_enabled: boolean;
}

export async function getProviderById(id: string): Promise<ProviderRow | null> {
  const res = await pool.query(`SELECT * FROM ai_providers WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function getProviderByCode(code: string): Promise<ProviderRow | null> {
  const res = await pool.query(`SELECT * FROM ai_providers WHERE code = $1`, [code]);
  return res.rows[0] ?? null;
}

export async function listProviders(enabledOnly = true): Promise<ProviderRow[]> {
  const res = enabledOnly
    ? await pool.query(`SELECT * FROM ai_providers WHERE is_enabled = TRUE ORDER BY display_name`)
    : await pool.query(`SELECT * FROM ai_providers ORDER BY display_name`);
  return res.rows;
}

export async function getModelById(id: string): Promise<ModelRow | null> {
  const res = await pool.query(`SELECT * FROM ai_provider_models WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function listModels(providerId?: string, enabledOnly = true): Promise<ModelRow[]> {
  if (providerId) {
    const res = enabledOnly
      ? await pool.query(`SELECT * FROM ai_provider_models WHERE provider_id=$1 AND is_enabled=TRUE ORDER BY model_name`, [providerId])
      : await pool.query(`SELECT * FROM ai_provider_models WHERE provider_id=$1 ORDER BY model_name`, [providerId]);
    return res.rows;
  }
  const res = enabledOnly
    ? await pool.query(`SELECT * FROM ai_provider_models WHERE is_enabled=TRUE ORDER BY model_name`)
    : await pool.query(`SELECT * FROM ai_provider_models ORDER BY model_name`);
  return res.rows;
}
