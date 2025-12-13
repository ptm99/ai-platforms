// src/pages/projects/ProjectSharePage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  apiGetProject,
  apiGetProjectMembers,
  apiAddProjectMember,
  apiUpdateProjectMember,
  apiRemoveProjectMember,
  apiLeaveProject,
  apiUpdateProjectVisibility,
  apiCloneProject,
  Project,
  ProjectMember,
  Visibility,
  MemberPermission
} from '../../api/project.api';
import { useAuth } from '../../hooks/useAuth';

const ProjectSharePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<MemberPermission>('read');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canManage =
    user &&
    project &&
    (user.id === String(project.owner_id) ||
      user.role === 'admin' ||
      user.role === 'superadmin');

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await apiGetProject(id);
        setProject(p);
        setVisibility(p.visibility);
        const m = await apiGetProjectMembers(id);
        setMembers(m);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load sharing info');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const handleAddMember = async () => {
    if (!id || !newEmail.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiAddProjectMember(id, newEmail.trim(), newPermission);
      setMembers(updated);
      setNewEmail('');
      setMessage('Collaborator added/updated');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to add collaborator');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = async (userId: string, permission: MemberPermission) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiUpdateProjectMember(id, userId, permission);
      setMembers(updated);
      setMessage('Permission updated');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiRemoveProjectMember(id, userId);
      setMembers(updated);
      setMessage('Collaborator removed');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove collaborator');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiLeaveProject(id);
      navigate('/projects');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to leave project');
      setSaving(false);
    }
  };

  const handleVisibilityChange = async (v: Visibility) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiUpdateProjectVisibility(id, v);
      setProject(updated);
      setVisibility(updated.visibility);
      setMessage('Visibility updated');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const cloned = await apiCloneProject(id);
      setMessage('Project cloned');
      navigate(`/projects/${cloned.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to clone project');
      setSaving(false);
    }
  };

  if (loading) return <div>Loading sharing settings…</div>;
  if (!project) return <div>Project not found</div>;

  const currentUserId = user?.id;
  const isOwner = currentUserId && currentUserId === String(project.owner_id);

  return (
    <div>
      <h1>Share Project</h1>
      <p>
        <strong>{project.title}</strong> (visibility: {project.visibility})
      </p>

      {error && (
        <div style={{ color: 'red', marginBottom: 8 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ color: 'green', marginBottom: 8 }}>
          {message}
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <h3>Visibility</h3>
        <p>Controls who can see this project.</p>
        <div>
          <label>
            <input
              type="radio"
              value="private"
              checked={visibility === 'private'}
              onChange={() => handleVisibilityChange('private')}
              disabled={!canManage || saving}
            />
            Private (only owner and explicit collaborators)
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              value="shared"
              checked={visibility === 'shared'}
              onChange={() => handleVisibilityChange('shared')}
              disabled={!canManage || saving}
            />
            Shared (only explicit collaborators)
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              value="public"
              checked={visibility === 'public'}
              onChange={() => handleVisibilityChange('public')}
              disabled={!canManage || saving}
            />
            Public (all users can read)
          </label>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Collaborators</h3>

        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            marginBottom: 12
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>User</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Role</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Permission</th>
              <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = currentUserId === m.user_id;
              const canChangeMember =
                canManage && m.role === 'member'; // owner row is read-only

              return (
                <tr key={m.user_id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>
                    {m.display_name || m.email}
                    {isSelf && ' (you)'}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {m.role}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {m.role === 'owner' ? (
                      '—'
                    ) : (
                      <select
                        value={m.permission || 'read'}
                        onChange={(e) =>
                          handlePermissionChange(
                            m.user_id,
                            e.target.value as MemberPermission
                          )
                        }
                        disabled={!canChangeMember || saving}
                      >
                        <option value="read">read</option>
                        <option value="edit">edit</option>
                      </select>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    {m.role === 'owner' ? (
                      '—'
                    ) : isSelf ? (
                      <button onClick={handleLeaveProject} disabled={saving}>
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        disabled={!canChangeMember || saving}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {canManage && visibility !== 'public' && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <input
              type="email"
              placeholder="Add user by email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={saving}
              style={{ flex: 1 }}
            />
            <select
              value={newPermission}
              onChange={(e) =>
                setNewPermission(e.target.value as MemberPermission)
              }
              disabled={saving}
            >
              <option value="read">read</option>
              <option value="edit">edit</option>
            </select>
            <button onClick={handleAddMember} disabled={saving || !newEmail.trim()}>
              Add
            </button>
          </div>
        )}

        {visibility === 'public' && (
          <p style={{ marginTop: 8, fontSize: '0.9em', color: '#666' }}>
            Project is public; all users can read it. Collaborators are usually unnecessary.
          </p>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Clone Project</h3>
        <p>
          Create a private copy of this project (including existing messages) under your
          ownership.
        </p>
        <button onClick={handleClone} disabled={saving}>
          Clone project
        </button>
      </section>

      <p>
        <Link to={`/projects/${project.id}`}>Back to project</Link>
      </p>
    </div>
  );
};

export default ProjectSharePage;
