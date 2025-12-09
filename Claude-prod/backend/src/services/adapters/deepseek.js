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
      model: this.modelName || 'deepseek-chat',
      messages: this.transformMessages(messages),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.max_tokens || 1000
    };
  }

  getHeaders(apiKey) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  extractResponse(responseData) {
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      throw new Error('Invalid response format from DeepSeek');
    }
    return responseData.choices[0].message.content;
  }

  extractTokenCount(responseData) {
    return responseData.usage?.total_tokens || 0;
  }
}

module.exports = DeepSeekAdapter;