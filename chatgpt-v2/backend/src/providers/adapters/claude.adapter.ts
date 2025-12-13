import fetch from 'node-fetch';
import { ProviderAdapter, SendChatParams, StreamChunk } from '../../modules/providers/adapter.types.js';

// Claude Messages API (Anthropic). Streaming differs; we provide non-stream + chunked fallback.
const ClaudeAdapter: ProviderAdapter = {
  providerCode: 'claude',

  async sendChat(params) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxOutputTokens ?? 1024,
        messages: params.messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      })
    });

    if (!resp.ok) throw new Error(`Claude error ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as any;
    const text = json.content?.map((c: any) => c.text).join('') ?? '';
    return { text, raw: json };
  },

  async *sendChatStream(params): AsyncGenerator<StreamChunk, void, void> {
    const { text, raw } = await this.sendChat(params);
    const step = 64;
    for (let i = 0; i < text.length; i += step) yield { delta: text.slice(i, i + step), raw };
    yield { delta: '', done: true };
  }
};

export default ClaudeAdapter;
