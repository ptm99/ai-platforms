import React, { useEffect, useState } from 'react';
import {
  adminListProviders,
  adminListModels,
  adminListKeys,
  adminCreateKey,
  adminUpdateKey,
  adminDeleteKey,
  AIProvider,
  AIProviderModel,
  AIProviderKey
} from '../../api/admin.api';

const KeysAdminPage: React.FC = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<AIProviderModel[]>([]);
  const [keys, setKeys] = useState<AIProviderKey[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');

  const [keyName, setKeyName] = useState('');
  const [apiKeyPlain, setApiKeyPlain] = useState('');
  const [dailyLimit, setDailyLimit] = useState('200000');

  const load = async () => {
    setError(null);
    try {
      const ps = await adminListProviders();
      setProviders(ps);
      const ms = await adminListModels(providerId || undefined);
      setModels(ms);
      const ks = await adminListKeys(modelId || undefined);
      setKeys(ks);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load keys');
    }
  };

  useEffect(() => {
    void load();
  }, [providerId, modelId]);

  const create = async () => {
    if (!providerId || !modelId || !apiKeyPlain.trim()) return;
    setError(null);
    try {
      await adminCreateKey({
        provider_id: providerId,
        model_id: modelId,
        name: keyName.trim() || undefined,
        api_key_plain: apiKeyPlain.trim(),
        daily_limit: dailyLimit ? parseInt(dailyLimit, 10) : undefined
      });
      setKeyName('');
      setApiKeyPlain('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create key');
    }
  };

  const update = async (k: AIProviderKey, patch: Partial<Pick<AIProviderKey, 'status' | 'daily_limit'>>) => {
    setError(null);
    try {
      await adminUpdateKey({
        key_id: k.id,
        status: patch.status ?? k.status,
        daily_limit: patch.daily_limit ?? k.daily_limit
      });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update key');
    }
  };

  const del = async (id: string) => {
    setError(null);
    try {
      await adminDeleteKey(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete key');
    }
  };

  return (
    <div>
      <h1>Admin: Keys</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label>Provider:</label>
        <select value={providerId} onChange={(e) => { setProviderId(e.target.value); setModelId(''); }}>
          <option value="">(All)</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name} ({p.code})
            </option>
          ))}
        </select>

        <label>Model:</label>
        <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
          <option value="">(All)</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.model_name}
            </option>
          ))}
        </select>
      </div>

      <h3>Create key</h3>
      <div style={{ display: 'grid', gap: 8, maxWidth: 680 }}>
        <input placeholder="Key name (optional)" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
        <input placeholder="API key (plain text)" value={apiKeyPlain} onChange={(e) => setApiKeyPlain(e.target.value)} />
        <input placeholder="Daily limit" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
        <button onClick={create} disabled={!providerId || !modelId || !apiKeyPlain.trim()}>
          Create
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>Keys</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Name</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Status</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Daily usage</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Daily limit</th>
            <th style={{ borderBottom: '1px solid #ccc' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td style={{ borderBottom: '1px solid #eee' }}>{k.name || k.id}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <select
                  value={k.status}
                  onChange={(e) => update(k, { status: e.target.value as any })}
                >
                  <option value="active">active</option>
                  <option value="exhausted">exhausted</option>
                  <option value="disabled">disabled</option>
                </select>
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{k.daily_usage}</td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <input
                  style={{ width: 110 }}
                  value={String(k.daily_limit)}
                  onChange={(e) => update(k, { daily_limit: parseInt(e.target.value || '0', 10) })}
                />
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                <button onClick={() => del(k.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {keys.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 12 }}>
                No keys.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default KeysAdminPage;
