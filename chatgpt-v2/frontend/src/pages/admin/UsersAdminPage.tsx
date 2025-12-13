import React, { useEffect, useState } from 'react';
import { adminListUsers, adminSetUserRole, AdminUser } from '../../api/admin.api';

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      setUsers(await adminListUsers());
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load users');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setRole = async (u: AdminUser, role: AdminUser['role']) => {
    setError(null);
    try {
      await adminSetUserRole(u.id, role);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update role');
    }
  };

  return (
    <div>
      <h1>Admin: Users (superadmin)</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Email</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Role</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Active</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ borderBottom: '1px solid #eee' }}>{u.email}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{u.role}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{u.is_active ? 'Yes' : 'No'}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <select
                  value={u.role}
                  onChange={(e) => setRole(u, e.target.value as any)}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 12 }}>
                No users.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersAdminPage;
