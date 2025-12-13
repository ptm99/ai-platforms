import fetch from 'node-fetch';
import { ProviderAdapter, SendChatParams, StreamChunk } from '../../modules/providers/adapter.types.js';

function toOpenAIMessages(msgs: SendChatParams['messages']) {
  return msgs.map(m => ({ role: m.role, content: m.content }));
}

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
        const data = trimmed.slice(5).trim();
        yield data;
      }
    }
  }
}

const OpenAIAdapter: ProviderAdapter = {
  providerCode: 'openai',

  async sendChat(params) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: toOpenAIMessages(params.messages),
        temperature: params.temperature ?? 0.2
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error ${resp.status}: ${t}`);
    }

    const json = await resp.json() as any;
    const text = json.choices?.[0]?.message?.content ?? '';
    return { text, raw: json };
  },

  async *sendChatStream(params): AsyncGenerator<StreamChunk, void, void> {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: toOpenAIMessages(params.messages),
        temperature: params.temperature ?? 0.2,
        stream: true
      })
    });

    if (!resp.ok || !resp.body) {
      const t = await resp.text().catch(() => '');
      throw new Error(`OpenAI stream error ${resp.status}: ${t}`);
    }

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

export default OpenAIAdapter;
