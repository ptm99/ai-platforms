import React, { useEffect, useState } from 'react';
import {
  adminListProviders,
  adminListModels,
  adminCreateModel,
  adminToggleModel,
  adminDeleteModel,
  AIProvider,
  AIProviderModel
} from '../../api/admin.api';

const ModelsAdminPage: React.FC = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [providerId, setProviderId] = useState<string>('');
  const [models, setModels] = useState<AIProviderModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modelName, setModelName] = useState('');
  const [contextLength, setContextLength] = useState<string>('');

  const loadProviders = async () => {
    setProviders(await adminListProviders());
  };

  const loadModels = async () => {
    setError(null);
    try {
      setModels(await adminListModels(providerId || undefined));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load models');
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  useEffect(() => {
    void loadModels();
  }, [providerId]);

  const create = async () => {
    if (!providerId || !modelName.trim()) return;
    setError(null);
    try {
      await adminCreateModel({
        provider_id: providerId,
        model_name: modelName.trim(),
        context_length: contextLength ? parseInt(contextLength, 10) : undefined
      });
      setModelName('');
      setContextLength('');
      await loadModels();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create model');
    }
  };

  const toggle = async (m: AIProviderModel) => {
    setError(null);
    try {
      await adminToggleModel(m.id, !m.is_enabled);
      await loadModels();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to toggle model');
    }
  };

  const del = async (id: string) => {
    setError(null);
    try {
      await adminDeleteModel(id);
      await loadModels();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete model');
    }
  };

  return (
    <div>
      <h1>Admin: Models</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <label>Provider:</label>
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
          <option value="">(All)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name} ({p.code})
            </option>
          ))}
        </select>
      </div>

      <h3>Create model</h3>
      <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <input placeholder="model_name" value={modelName} onChange={(e) => setModelName(e.target.value)} />
        <input placeholder="context_length (optional)" value={contextLength} onChange={(e) => setContextLength(e.target.value)} />
        <button onClick={create} disabled={!providerId || !modelName.trim()}>
          Create
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>Models</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Model</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Context</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Enabled</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td style={{ borderBottom: '1px solid #eee' }}>{m.model_name}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.context_length ?? '—'}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{m.is_enabled ? 'Yes' : 'No'}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <button onClick={() => toggle(m)} style={{ marginRight: 8 }}>
                  {m.is_enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => del(m.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {models.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 12 }}>
                No models.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ModelsAdminPage;
