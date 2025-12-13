import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool.js';
import { sha256Hex } from '../../utils/crypto.util.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.util.js';

export async function register(email: string, password: string, displayName?: string) {
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `
    INSERT INTO users (email, password_hash, display_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, display_name, role
    `,
    [email.toLowerCase(), hash, displayName ?? null]
  );
  return res.rows[0];
}

export async function login(email: string, password: string, userAgent?: string, ip?: string) {
  const res = await pool.query(
    `SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  if (!res.rows.length) throw new Error('Invalid credentials');

  const u = res.rows[0];
  if (!u.is_active) throw new Error('User disabled');

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) throw new Error('Invalid credentials');

  const access = signAccessToken({ sub: String(u.id), role: u.role, email: u.email });
  const refresh = signRefreshToken({ sub: String(u.id) });

  const refreshHash = sha256Hex(refresh);
  const expiresDays = 30;
  await pool.query(
    `
    INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::interval)
    `,
    [u.id, refreshHash, userAgent ?? null, ip ?? null, expiresDays]
  );

  return { access_token: access, refresh_token: refresh, user: { id: String(u.id), email: u.email, role: u.role } };
}

export async function listUsers() {
  const res = await pool.query(
    `SELECT id, email, display_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC`
  );
  return res.rows;
}

export async function setUserRole(userId: string, role: 'user'|'admin'|'superadmin') {
  const res = await pool.query(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING id, email, display_name, role, is_active`,
    [userId, role]
  );
  return res.rows[0] ?? null;
}
