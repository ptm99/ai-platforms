const BaseAdapter = require('./BaseAdapter');

class DeepSeekAdapter extends BaseAdapter {
  transformMessages(messages) {
    // DeepSeek uses OpenAI-compatible format
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  buildRequestPayload(messages) {
    return {
      model: this.modelName,
      messages: this.transformMessages(messages),
      temperature: this.config.temperature || 0.7
    };
  }

  getHeaders(apiKey) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  extractResponse(responseData) {
    return responseData.choices[0].message.content;
  }

  extractTokenCount(responseData) {
    return responseData.usage?.total_tokens || 0;
  }
}

module.exports = DeepSeekAdapter;