import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChat, setNewChat] = useState({ title: '', provider_id: '' });

  useEffect(() => {
    loadProject();
    loadProviders();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await client.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await client.get('/providers');
      setProviders(response.data.providers);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const handleCreateChat = async () => {
    if (!newChat.title.trim() || !newChat.provider_id) return;

    try {
      const response = await client.post(`/chats/project/${projectId}`, newChat);
      console.log('Chat created:', response.data);
      setShowCreateModal(false);
      setNewChat({ title: '', provider_id: '' });
      loadProject();
    } catch (error) {
      console.error('Failed to create chat:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to create chat. Check console for details.');
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await client.delete(`/chats/${chatId}`);
      loadProject();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>;
    } else if (status === 'pending_rate_limit') {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Rate Limited</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading size="lg" text="Loading project..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Project not found</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Chats List */}
      {project.chats && project.chats.length === 0 ? (
        <Card className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
          <p className="text-gray-600 mb-4">Create your first chat to start talking with AI</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Chat
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.chats.map((chat) => (
            <Card
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center flex-1">
                  <MessageSquare className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {chat.title}
                  </h3>
                </div>
                {project.is_owner && (
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="text-gray-400 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium text-gray-900">{chat.provider}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-medium text-gray-900">{chat.message_count}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  {getStatusBadge(chat.status)}
                </div>
              </div>

              {chat.status === 'pending_rate_limit' && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>This chat is temporarily rate limited. Try again later.</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Chat Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Chat"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChat}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Chat Title"
            value={newChat.title}
            onChange={(e) => setNewChat({ ...newChat, title: e.target.value })}
            placeholder="Enter chat title"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider *
            </label>
            <select
              value={newChat.provider_id}
              onChange={(e) => setNewChat({ ...newChat, provider_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name} ({provider.available_keys} keys available)
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Project;