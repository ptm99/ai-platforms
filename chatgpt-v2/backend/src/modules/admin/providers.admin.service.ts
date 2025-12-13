import { pool } from '../../db/pool.js';

export async function adminListProviders() {
  const res = await pool.query(`SELECT * FROM ai_providers ORDER BY created_at DESC`);
  return res.rows;
}

export async function adminCreateProvider(input: { code: string; display_name: string; adapter_file: string; description?: string }) {
  const res = await pool.query(
    `INSERT INTO ai_providers (code, display_name, adapter_file, description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [input.code.trim().toLowerCase(), input.display_name.trim(), input.adapter_file.trim(), input.description ?? null]
  );
  return res.rows[0];
}

export async function adminUpdateProvider(providerId: string, patch: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (typeof patch.is_enabled === 'boolean') { fields.push(`is_enabled=$${i++}`); values.push(patch.is_enabled); }
  if (typeof patch.display_name === 'string') { fields.push(`display_name=$${i++}`); values.push(patch.display_name.trim()); }
  if (typeof patch.adapter_file === 'string') { fields.push(`adapter_file=$${i++}`); values.push(patch.adapter_file.trim()); }
  if (typeof patch.description === 'string') { fields.push(`description=$${i++}`); values.push(patch.description); }

  if (!fields.length) throw new Error('No fields to update');
  values.push(providerId);

  const res = await pool.query(
    `UPDATE ai_providers SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`,
    values
  );
  return res.rows[0] ?? null;
}

export async function adminDeleteProvider(providerId: string) {
  await pool.query(`DELETE FROM ai_providers WHERE id=$1`, [providerId]);
}
