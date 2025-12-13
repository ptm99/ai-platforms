import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGetProject, Project } from '../../api/project.api';
import { apiListMessages, ChatMessage, apiSendMessage } from '../../api/message.api';
import ChatMessageComponent from '../../components/chat/ChatMessage';
import ChatInput from '../../components/chat/ChatInput';
import { useStreamChat } from '../../hooks/useStreamChat';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantStreamingText, setAssistantStreamingText] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const p = await apiGetProject(id);
        setProject(p);
        const m = await apiListMessages(id);
        setMessages(m);
      } catch (err: any) {
        console.error(err);
      }
    };
    void load();
  }, [id]);

  const { loading: streaming, error: streamError, sendStreaming } = useStreamChat(
    id || '',
    (fullText) => {
      setAssistantStreamingText(fullText);
    },
    () => {
      if (id) {
        // After stream done, refresh messages from backend
        void apiListMessages(id).then(setMessages);
        setAssistantStreamingText(null);
      }
    }
  );

  const handleSend = async (content: string) => {
    if (!id) return;
    // optimistic user message
    setMessages((prev) => [...prev, { role: 'user', content: { text: content } }]);
    // stream assistant
    void sendStreaming(content);
  };

  if (!project) return <div>Loading project…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>{project.title}</h1>
          <small>Visibility: {project.visibility}</small>
        </div>
        <div>
          <button onClick={() => navigate(`/projects/${project.id}/share`)}>Share…</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ddd', padding: 8 }}>
        {messages.map((m, idx) => (
          <ChatMessageComponent key={m.id || idx} message={m} />
        ))}
        {assistantStreamingText && (
          <ChatMessageComponent
            message={{ role: 'assistant', content: { text: assistantStreamingText } }}
          />
        )}
        {streamError && <div style={{ color: 'red' }}>{streamError}</div>}
      </div>

      <ChatInput onSend={handleSend} disabled={streaming} />

      <div style={{ marginTop: 8 }}>
        <Link to="/projects">Back to projects</Link>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
