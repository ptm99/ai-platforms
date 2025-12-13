import fetch from 'node-fetch';
import { ProviderAdapter, SendChatParams, StreamChunk } from '../../modules/providers/adapter.types.js';

// Gemini public API is not OpenAI-compatible. This adapter uses Google Generative Language API style.
// For production, wire to your chosen Gemini endpoint. Here we implement non-streaming and a safe streaming fallback.

const GeminiAdapter: ProviderAdapter = {
  providerCode: 'gemini',

  async sendChat(params) {
    // Using v1beta models endpoint pattern
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

    const contents = params.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!resp.ok) throw new Error(`Gemini error ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as any;
    const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return { text, raw: json };
  },

  async *sendChatStream(params): AsyncGenerator<StreamChunk, void, void> {
    // Gemini streaming endpoint differs; as a conservative default, call non-stream and emit in chunks.
    const { text, raw } = await this.sendChat(params);
    const step = 64;
    for (let i = 0; i < text.length; i += step) {
      yield { delta: text.slice(i, i + step), raw };
    }
    yield { delta: '', done: true };
  }
};

export default GeminiAdapter;
