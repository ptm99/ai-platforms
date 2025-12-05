// Provider adapters and endpoint helpers
export const providers = {
  openai: {
    name: "openai",
    kind: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    prepare: (model, messages) => ({ model, messages }),
    headers: (apiKey) => ({ "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }),
    extractUsage: (resp) => resp.usage?.total_tokens
  },
  gemini: {
    name: "gemini",
    kind: "gemini",
    // Gemini REST generate endpoint varies; we'll use generateContent on model resource
    // Caller should build endpoint: `${base}/${model}:generateContent`
    base: "https://generativelanguage.googleapis.com/v1/models",
    prepare: (model, messages) => {
      // simple conversion: concatenate user messages into a prompt
      const text = messages.map(m => `${m.role}: ${m.content}`).join("\n");
      return { prompt: { text } };
    },
    headers: (apiKey) => ({ "Content-Type": "application/json", "x-goog-api-key": apiKey }),
    extractUsage: (resp) => {
      // Gemini may not return token usage; return undefined to let estimator run
      return undefined;
    }
  },
  claude: {
    name: "claude",
    kind: "claude",
    endpoint: "https://api.anthropic.com/v1/messages",
    prepare: (model, messages) => ({ model, messages }),
    headers: (apiKey) => ({ "x-api-key": apiKey, "Content-Type": "application/json" }),
    extractUsage: (resp) => resp.usage?.total_tokens
  }
};
