export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SendChatParams {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}

export interface StreamChunk {
  delta: string;
  done?: boolean;
  raw?: any;
}

export interface ProviderAdapter {
  providerCode: string;
  sendChat(params: SendChatParams): Promise<{ text: string; raw?: any }>;
  sendChatStream(params: SendChatParams): AsyncGenerator<StreamChunk, void, void>;
}
