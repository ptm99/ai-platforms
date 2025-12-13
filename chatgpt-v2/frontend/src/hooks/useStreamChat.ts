import { useState } from 'react';
import { getAccessToken } from '../utils/token';
import { ChatMessage } from '../api/message.api';

interface StreamState {
  loading: boolean;
  error: string | null;
}

export function useStreamChat(projectId: string, onDelta: (text: string) => void, onDone: () => void) {
  const [state, setState] = useState<StreamState>({ loading: false, error: null });

  const sendStreaming = async (content: string) => {
    setState({ loading: true, error: null });
    const token = getAccessToken();
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    try {
      const url = new URL(`/messages/stream/${projectId}`, base);
      url.searchParams.set('content', content);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });

      if (!res.body) {
        throw new Error('No response body for streaming');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex).trim();
          buffer = buffer.slice(sepIndex + 2);
          if (!rawEvent) continue;

          const lines = rawEvent.split('\n').map((l) => l.trim());
          let eventName = 'message';
          let dataLine: string | null = null;

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice('event:'.length).trim();
            } else if (line.startsWith('data:')) {
              dataLine = line.slice('data:'.length).trim();
            }
          }

          if (!dataLine) continue;

          let data: any;
          try {
            data = JSON.parse(dataLine);
          } catch {
            continue;
          }

          if (eventName === 'delta' && data.content) {
            assistantText += data.content as string;
            onDelta(assistantText);
          } else if (eventName === 'done') {
            onDone();
          } else if (eventName === 'error') {
            setState({ loading: false, error: data.message || 'Streaming error' });
            return;
          }
        }
      }

      setState({ loading: false, error: null });
    } catch (err: any) {
      setState({ loading: false, error: err.message || 'Streaming error' });
    }
  };

  return { ...state, sendStreaming };
}
