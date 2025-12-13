import { pool } from '../../db/pool.js';
import { decrypt } from '../../utils/crypto.util.js';
import { loadAdapter } from '../providers/adapterLoader.js';
import { getProviderById, getModelById } from '../providers/provider.service.js';
import { recordKeyUsage } from '../providers/keySelector.service.js';

export async function listMessages(projectId: string) {
  const res = await pool.query(
    `SELECT id, project_id, user_id, role, content, provider_code, model_name, created_at FROM messages WHERE project_id=$1 ORDER BY created_at ASC`,
    [projectId]
  );
  return res.rows;
}

export async function appendMessage(projectId: string, userId: string | null, role: 'user'|'assistant'|'system', contentText: string, providerCode?: string, modelName?: string) {
  const res = await pool.query(
    `INSERT INTO messages (project_id, user_id, role, content, provider_code, model_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [projectId, userId ? parseInt(userId, 10) : null, role, { text: contentText }, providerCode ?? null, modelName ?? null]
  );
  return res.rows[0];
}

export async function sendMessageOnce(projectId: string, userId: string, text: string) {
  // Validate project and pinned provider_key
  const pRes = await pool.query(`SELECT * FROM projects WHERE id=$1`, [projectId]);
  if (!pRes.rows.length) throw new Error('Project not found');
  const project = pRes.rows[0];

  const provider = await getProviderById(project.provider_id);
  if (!provider) throw new Error('Provider not found');
  const model = await getModelById(project.model_id);
  if (!model) throw new Error('Model not found');

  const kRes = await pool.query(`SELECT * FROM ai_provider_keys WHERE id=$1`, [project.provider_key_id]);
  if (!kRes.rows.length) throw new Error('Pinned key not found');
  const keyRow = kRes.rows[0];
  if (keyRow.status !== 'active') throw new Error('Pinned key is not active');

  const apiKey = decrypt(keyRow.api_key_enc);

  // store user message
  await appendMessage(projectId, userId, 'user', text, provider.code, model.model_name);

  // build context from messages
  const historyRes = await pool.query(
    `SELECT role, content FROM messages WHERE project_id=$1 ORDER BY created_at ASC`,
    [projectId]
  );
  const messages = historyRes.rows.map((r: any) => ({
    role: r.role as 'system'|'user'|'assistant',
    content: String(r.content?.text ?? '')
  }));

  const adapter = await loadAdapter(provider.adapter_file);

  const result = await adapter.sendChat({
    apiKey,
    model: model.model_name,
    messages
  });

  await appendMessage(projectId, null, 'assistant', result.text, provider.code, model.model_name);

  // rough token accounting is provider-specific; keep 0/0 for now
  await recordKeyUsage(keyRow.id, 0, 0);

  return { text: result.text };
}

export async function *sendMessageStream(projectId: string, userId: string, text: string) {
  const pRes = await pool.query(`SELECT * FROM projects WHERE id=$1`, [projectId]);
  if (!pRes.rows.length) throw new Error('Project not found');
  const project = pRes.rows[0];

  const provider = await getProviderById(project.provider_id);
  if (!provider) throw new Error('Provider not found');
  const model = await getModelById(project.model_id);
  if (!model) throw new Error('Model not found');

  const kRes = await pool.query(`SELECT * FROM ai_provider_keys WHERE id=$1`, [project.provider_key_id]);
  if (!kRes.rows.length) throw new Error('Pinned key not found');
  const keyRow = kRes.rows[0];
  if (keyRow.status !== 'active') throw new Error('Pinned key is not active');

  const apiKey = decrypt(keyRow.api_key_enc);

  await appendMessage(projectId, userId, 'user', text, provider.code, model.model_name);

  const historyRes = await pool.query(
    `SELECT role, content FROM messages WHERE project_id=$1 ORDER BY created_at ASC`,
    [projectId]
  );
  const messages = historyRes.rows.map((r: any) => ({
    role: r.role as 'system'|'user'|'assistant',
    content: String(r.content?.text ?? '')
  }));

  const adapter = await loadAdapter(provider.adapter_file);

  let assistantText = '';
  for await (const chunk of adapter.sendChatStream({
    apiKey,
    model: model.model_name,
    messages
  })) {
    if (chunk.delta) assistantText += chunk.delta;
    yield chunk.delta ?? '';
  }

  await appendMessage(projectId, null, 'assistant', assistantText, provider.code, model.model_name);
  await recordKeyUsage(keyRow.id, 0, 0);
}
