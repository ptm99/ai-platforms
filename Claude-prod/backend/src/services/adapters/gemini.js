const BaseAdapter = require('./BaseAdapter');

class GeminiAdapter extends BaseAdapter {
  transformMessages(messages) {
    // Gemini format: contents array with role 'user' or 'model'
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
  }

  buildRequestPayload(messages) {
    return {
      contents: this.transformMessages(messages)
    };
  }

  getHeaders(apiKey) {
    // Gemini uses API key as query parameter, not in headers
    return {
      'Content-Type': 'application/json'
    };
  }

  // Override to add API key to URL
  getEndpoint(apiKey) {
    return `${this.endpoint}?key=${apiKey}`;
  }

  extractResponse(responseData) {
    return responseData.candidates[0].content.parts[0].text;
  }

  extractTokenCount(responseData) {
    return responseData.usageMetadata?.totalTokenCount || 0;
  }
}

module.exports = GeminiAdapter;