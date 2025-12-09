import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Bot, User as UserIcon } from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useAuth } from '../contexts/AuthContext';

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChat = async () => {
    try {
      const response = await client.get(`/chats/${chatId}`);
      setChat(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const userMessage = {
      role: 'user',
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    // Optimistically add user message
    setMessages([...messages, userMessage]);
    setNewMessage('');
    setSending(true);

    try {
      const response = await client.post(`/chats/${chatId}/messages`, {
        content: newMessage,
      });

      // Replace temp message with real one including AI response
      const updatedMessages = [...messages, userMessage, response.data.message];
      setMessages(updatedMessages);
      
      // Update chat status
      if (chat) {
        setChat({ ...chat, status: response.data.chat_status });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Handle rate limit
      if (error.response?.status === 429) {
        const data = error.response.data;
        if (chat) {
          setChat({
            ...chat,
            status: data.chat_status,
            rate_limit_reset_at: data.rate_limit_reset_at,
          });
        }
        alert('Rate limit exceeded. This chat will be available again later.');
      } else {
        alert('Failed to send message');
      }
      
      // Remove optimistic message on error
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading size="lg" text="Loading chat..." />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Chat not found</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isPending = chat.status === 'pending_rate_limit';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">{chat.title}</h1>
          <p className="text-sm text-gray-600">
            Provider: {chat.provider}
            {isPending && (
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                Rate Limited
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Rate Limit Warning */}
      {isPending && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">This chat is temporarily rate limited</p>
            <p className="mt-1">
              The API key has reached its rate limit. Please try again later.
              {chat.rate_limit_reset_at && (
                <> Reset at: {new Date(chat.rate_limit_reset_at).toLocaleString()}</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200 p-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start max-w-[70%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-300 mr-3'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <UserIcon className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-gray-700" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isPending ? 'Chat is rate limited...' : 'Type your message...'}
          disabled={sending || isPending}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <Button type="submit" disabled={sending || isPending || !newMessage.trim()}>
          {sending ? (
            <Loading size="sm" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default Chat;