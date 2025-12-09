import React, { useState, useEffect } from 'react';
import { Users, Key, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '' });
  const [newKey, setNewKey] = useState({ provider_id: '', key_value: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        // For now, we don't have a list users endpoint, so we'll show a placeholder
        // You may want to add a GET /api/admin/users endpoint
        setUsers([]);
      } else {
        const [keysRes, providersRes] = await Promise.all([
          client.get('/providers/keys'),
          client.get('/providers'),
        ]);
        setApiKeys(keysRes.data.keys);
        setProviders(providersRes.data.providers);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) return;

    try {
      await client.post('/auth/register', newUser);
      setShowUserModal(false);
      setNewUser({ username: '', password: '', email: '' });
      alert('User created successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleAddKey = async () => {
    if (!newKey.provider_id || !newKey.key_value) return;

    try {
      await client.post('/providers/keys', newKey);
      setShowKeyModal(false);
      setNewKey({ provider_id: '', key_value: '' });
      alert('API key added successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add API key');
    }
  };

  const handleUpdateKeyStatus = async (keyId, status) => {
    try {
      await client.put(`/providers/keys/${keyId}`, { status });
      loadData();
    } catch (error) {
      alert('Failed to update key status');
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await client.delete(`/providers/keys/${keyId}`);
      loadData();
    } catch (error) {
      alert('Failed to delete API key');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Manage users and API keys</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'keys'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            API Keys
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">User Management</h2>
                <Button onClick={() => setShowUserModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>

              <Card>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600 mb-4">
                    Create new users to give them access to the platform
                  </p>
                  <Button onClick={() => setShowUserModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First User
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">API Key Management</h2>
                <Button onClick={() => setShowKeyModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add API Key
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
                    <p className="text-gray-600 mb-4">
                      Add API keys for AI providers to start using the platform
                    </p>
                    <Button onClick={() => setShowKeyModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Key
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <Card key={key.id}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {key.provider_name}
                            </h3>
                            <span
                              className={`ml-3 px-2 py-1 text-xs rounded ${
                                key.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : key.status === 'rate_limited'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {key.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Key: {key.key_preview}</p>
                            <p>Usage: {key.usage_count} requests</p>
                            {key.last_used_at && (
                              <p>Last used: {new Date(key.last_used_at).toLocaleString()}</p>
                            )}
                            {key.rate_limit_reset_at && (
                              <p>
                                Rate limit resets: {new Date(key.rate_limit_reset_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {key.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateKeyStatus(key.id, 'disabled')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Disable
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateKeyStatus(key.id, 'active')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Enable
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Create New User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="Enter username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Enter password"
            required
          />
          <Input
            label="Email (optional)"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="Enter email"
          />
        </div>
      </Modal>

      {/* Add API Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title="Add API Key"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowKeyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey}>Add Key</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider *
            </label>
            <select
              value={newKey.provider_id}
              onChange={(e) => setNewKey({ ...newKey, provider_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="API Key"
            type="password"
            value={newKey.key_value}
            onChange={(e) => setNewKey({ ...newKey, key_value: e.target.value })}
            placeholder="Enter API key"
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default Admin;