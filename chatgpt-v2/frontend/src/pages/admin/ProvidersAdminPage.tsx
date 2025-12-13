import React, { useEffect, useState } from 'react';
import {
  adminListProviders,
  adminCreateProvider,
  adminToggleProvider,
  adminDeleteProvider,
  AIProvider
} from '../../api/admin.api';

const ProvidersAdminPage: React.FC = () => {
  const [items, setItems] = useState<AIProvider[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adapterFile, setAdapterFile] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setError(null);
    try {
      setItems(await adminListProviders());
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load providers');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setError(null);
    try {
      await adminCreateProvider({
        code: code.trim(),
        display_name: displayName.trim(),
        adapter_file: adapterFile.trim(),
        description: description.trim() || undefined
      });
      setCode('');
      setDisplayName('');
      setAdapterFile('');
      setDescription('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create provider');
    }
  };

  const toggle = async (p: AIProvider) => {
    setError(null);
    try {
      await adminToggleProvider(p.id, !p.is_enabled);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to toggle provider');
    }
  };

  const del = async (id: string) => {
    setError(null);
    try {
      await adminDeleteProvider(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete provider');
    }
  };

  return (
    <div>
      <h1>Admin: Providers</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <h3>Create provider</h3>
      <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <input placeholder="code (e.g., openai)" value={code} onChange={(e) => setCode(e.target.value)} />
        <input placeholder="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input placeholder="adapter_file (e.g., openai.adapter)" value={adapterFile} onChange={(e) => setAdapterFile(e.target.value)} />
        <input placeholder="description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button onClick={create} disabled={!code.trim() || !displayName.trim() || !adapterFile.trim()}>
          Create
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>Providers</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Code</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Adapter</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Enabled</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td style={{ borderBottom: '1px solid #eee' }}>{p.code}</td>
              <td style={{ borderBottom: '1px solid #eee' }}>{p.display_name}</td>
              <td style={{ borderBottom: '1px solid #eee' }}>{p.adapter_file}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {p.is_enabled ? 'Yes' : 'No'}
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <button onClick={() => toggle(p)} style={{ marginRight: 8 }}>
                  {p.is_enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => del(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 12 }}>
                No providers.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProvidersAdminPage;
