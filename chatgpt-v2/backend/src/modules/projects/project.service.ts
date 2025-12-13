import { pool } from '../../db/pool.js';
import { selectKeyForModel } from '../providers/keySelector.service.js';
import { getProviderById, getModelById } from '../providers/provider.service.js';

export type Visibility = 'private' | 'shared' | 'public';
export type MemberPermission = 'read' | 'edit';

export async function listUserProjects(userId: string) {
  const res = await pool.query(
    `
    SELECT DISTINCT p.*
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
    WHERE p.owner_id = $1 OR pm.user_id = $1 OR p.visibility = 'public'
    ORDER BY p.updated_at DESC
    `,
    [userId]
  );
  return res.rows;
}

export async function getProjectById(projectId: string) {
  const res = await pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  return res.rows[0] ?? null;
}

export async function userCanReadProject(userId: string, projectId: string) {
  const res = await pool.query(
    `
    SELECT 1
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
    WHERE p.id = $2
      AND (p.owner_id = $1 OR pm.user_id = $1 OR p.visibility = 'public')
    LIMIT 1
    `,
    [userId, projectId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function userCanEditProject(userId: string, projectId: string) {
  const res = await pool.query(
    `
    SELECT 1
    FROM projects p
    LEFT JOIN project_members pm
      ON pm.project_id = p.id
     AND pm.user_id = $1
     AND pm.permission = 'edit'
    WHERE p.id = $2
      AND (p.owner_id = $1 OR pm.user_id = $1)
    LIMIT 1
    `,
    [userId, projectId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function userIsProjectOwner(userId: string, projectId: string) {
  const res = await pool.query(
    `SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2`,
    [projectId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function isUserMember(projectId: string, userId: string) {
  const res = await pool.query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function countProjectMembers(projectId: string) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1`,
    [projectId]
  );
  return res.rows[0]?.count ?? 0;
}

export async function findUserByEmail(email: string) {
  const res = await pool.query(
    `SELECT id, email, display_name FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return res.rows[0]
    ? {
        id: String(res.rows[0].id),
        email: res.rows[0].email,
        display_name: res.rows[0].display_name
      }
    : null;
}

export async function listProjectMembers(projectId: string) {
  const res = await pool.query(
    `
    WITH owner_row AS (
      SELECT u.id AS user_id, u.email, u.display_name,
             'owner'::text AS role, NULL::text AS permission, p.created_at AS added_at
      FROM projects p JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    ),
    member_rows AS (
      SELECT u.id AS user_id, u.email, u.display_name,
             'member'::text AS role, pm.permission, pm.created_at AS added_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
    )
    SELECT * FROM owner_row
    UNION ALL
    SELECT * FROM member_rows
    ORDER BY role DESC, added_at
    `,
    [projectId]
  );

  return res.rows.map((r) => ({
    user_id: String(r.user_id),
    email: r.email,
    display_name: r.display_name,
    role: r.role,
    permission: r.permission,
    added_at: r.added_at
  }));
}

export async function addOrUpdateProjectMember(
  projectId: string,
  userId: string,
  permission: MemberPermission
) {
  if (!['read', 'edit'].includes(permission)) throw new Error('Invalid permission');

  await pool.query(
    `
    INSERT INTO project_members (project_id, user_id, permission)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, user_id) DO UPDATE SET permission = EXCLUDED.permission
    `,
    [projectId, userId, permission]
  );
}

export async function removeProjectMember(projectId: string, userId: string) {
  await pool.query(
    `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
}

export async function updateProjectVisibility(projectId: string, visibility: Visibility) {
  if (!['private', 'shared', 'public'].includes(visibility)) {
    throw new Error('Invalid visibility');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pRes = await client.query(`SELECT * FROM projects WHERE id = $1`, [projectId]);
    if (!pRes.rows.length) throw new Error('Project not found');

    const mRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1`,
      [projectId]
    );
    const memberCount: number = mRes.rows[0]?.count ?? 0;

    if (visibility === 'shared' && memberCount === 0) {
      throw new Error('Cannot set shared visibility without collaborators');
    }

    if (visibility === 'private') {
      // Enforce privacy: remove all collaborators
      await client.query(`DELETE FROM project_members WHERE project_id = $1`, [projectId]);
    }

    const uRes = await client.query(
      `UPDATE projects SET visibility = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [projectId, visibility]
    );

    await client.query('COMMIT');
    return uRes.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function createProject(
  ownerId: string,
  title: string,
  providerId: string,
  modelId: string
) {
  const provider = await getProviderById(providerId);
  if (!provider || !provider.is_enabled) throw new Error('Provider not found or disabled');

  const model = await getModelById(modelId);
  if (!model || !model.is_enabled || model.provider_id !== provider.id) {
    throw new Error('Model not found or disabled');
  }

  // New project selects key at creation time (lowest usage) and pins it
  const key = await selectKeyForModel(model.id);

  const res = await pool.query(
    `
    INSERT INTO projects (owner_id, title, visibility, provider_id, model_id, provider_key_id)
    VALUES ($1, $2, 'private', $3, $4, $5)
    RETURNING *
    `,
    [ownerId, title, provider.id, model.id, key.id]
  );

  return res.rows[0];
}

export async function leaveProject(projectId: string, userId: string) {
  const p = await getProjectById(projectId);
  if (!p) throw new Error('Project not found');

  if (String(p.owner_id) === String(userId)) {
    throw new Error('Owner cannot leave their own project');
  }

  const member = await isUserMember(projectId, userId);
  if (!member) throw new Error('User is not a collaborator');

  await removeProjectMember(projectId, userId);
}

export async function cloneProject(sourceProjectId: string, newOwnerId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const srcRes = await client.query(`SELECT * FROM projects WHERE id = $1`, [sourceProjectId]);
    if (!srcRes.rows.length) throw new Error('Source project not found');
    const src = srcRes.rows[0];

    const newRes = await client.query(
      `
      INSERT INTO projects (owner_id, title, visibility, provider_id, model_id, provider_key_id)
      VALUES ($1, $2 || ' (Copy)', 'private', $3, $4, $5)
      RETURNING *
      `,
      [newOwnerId, src.title, src.provider_id, src.model_id, src.provider_key_id]
    );
    const np = newRes.rows[0];

    await client.query(
      `
      INSERT INTO messages (project_id, user_id, role, content, provider_code, model_name, created_at)
      SELECT $2, user_id, role, content, provider_code, model_name, created_at
      FROM messages
      WHERE project_id = $1
      ORDER BY created_at ASC
      `,
      [sourceProjectId, np.id]
    );

    await client.query('COMMIT');
    return np;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
