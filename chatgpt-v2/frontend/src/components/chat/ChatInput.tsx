import React, { useState } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', marginTop: 12 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        style={{ flex: 1, resize: 'vertical' }}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled} style={{ marginLeft: 8 }}>
        Send
      </button>
    </form>
  );
};

export default ChatInput;
