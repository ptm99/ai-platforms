import { axiosClient } from './axiosClient';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: { text: string };
  created_at?: string;
}

export async function apiListMessages(projectId: string): Promise<ChatMessage[]> {
  const res = await axiosClient.get<ChatMessage[]>(`/messages/${projectId}`);
  return res.data;
}

export async function apiSendMessage(projectId: string, content: string) {
  const res = await axiosClient.post(`/messages/${projectId}`, { content });
  return res.data;
}
