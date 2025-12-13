import fetch from 'node-fetch';
import { ProviderAdapter, SendChatParams, StreamChunk } from '../../modules/providers/adapter.types.js';

// DeepSeek is OpenAI-compatible for chat completions on many deployments.
async function* parseSSE(body: NodeJS.ReadableStream): AsyncGenerator<string, void, void> {
  let buf = '';
  for await (const chunk of body as any) {
    buf += chunk.toString('utf8');
    while (true) {
      const idx = buf.indexOf('\n\n');
      if (idx === -1) break;
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        yield trimmed.slice(5).trim();
      }
    }
  }
}

const DeepSeekAdapter: ProviderAdapter = {
  providerCode: 'deepseek',

  async sendChat(params) {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: params.temperature ?? 0.2
      })
    });

    if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}: ${await resp.text()}`);
    const json = await resp.json() as any;
    const text = json.choices?.[0]?.message?.content ?? '';
    return { text, raw: json };
  },

  async *sendChatStream(params): AsyncGenerator<StreamChunk, void, void> {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(m => ({ role: m.role, content: m.content })),
        temperature: params.temperature ?? 0.2,
        stream: true
      })
    });

    if (!resp.ok || !resp.body) throw new Error(`DeepSeek stream error ${resp.status}: ${await resp.text()}`);

    for await (const data of parseSSE(resp.body as any)) {
      if (data === '[DONE]') {
        yield { delta: '', done: true };
        return;
      }
      let obj: any;
      try { obj = JSON.parse(data); } catch { continue; }
      const delta = obj.choices?.[0]?.delta?.content ?? '';
      if (delta) yield { delta, raw: obj };
    }
    yield { delta: '', done: true };
  }
};

export default DeepSeekAdapter;
