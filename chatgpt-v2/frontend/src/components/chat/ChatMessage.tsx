import React from 'react';
import { ChatMessage as ChatMessageType } from '../../api/message.api';

interface Props {
  message: ChatMessageType;
}

const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        marginBottom: 8,
        textAlign: isUser ? 'right' : 'left'
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '6px 10px',
          borderRadius: 6,
          background: isUser ? '#007bff' : '#f1f1f1',
          color: isUser ? '#fff' : '#000',
          maxWidth: '80%'
        }}
      >
        {message.content.text}
      </div>
    </div>
  );
};

export default ChatMessage;
