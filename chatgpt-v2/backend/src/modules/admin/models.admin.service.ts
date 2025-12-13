import { pool } from '../../db/pool.js';

export async function adminListModels(providerId?: string) {
  const res = providerId
    ? await pool.query(`SELECT * FROM ai_provider_models WHERE provider_id=$1 ORDER BY created_at DESC`, [providerId])
    : await pool.query(`SELECT * FROM ai_provider_models ORDER BY created_at DESC`);
  return res.rows;
}

export async function adminCreateModel(input: { provider_id: string; model_name: string; context_length?: number | null }) {
  const res = await pool.query(
    `INSERT INTO ai_provider_models (provider_id, model_name, context_length) VALUES ($1,$2,$3) RETURNING *`,
    [input.provider_id, input.model_name.trim(), input.context_length ?? null]
  );
  return res.rows[0];
}

export async function adminUpdateModel(modelId: string, patch: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (typeof patch.is_enabled === 'boolean') { fields.push(`is_enabled=$${i++}`); values.push(patch.is_enabled); }
  if (typeof patch.context_length === 'number') { fields.push(`context_length=$${i++}`); values.push(patch.context_length); }

  if (!fields.length) throw new Error('No fields to update');
  values.push(modelId);

  const res = await pool.query(
    `UPDATE ai_provider_models SET ${fields.join(', ')} WHERE id=$${i} RETURNING *`,
    values
  );
  return res.rows[0] ?? null;
}

export async function adminDeleteModel(modelId: string) {
  await pool.query(`DELETE FROM ai_provider_models WHERE id=$1`, [modelId]);
}
