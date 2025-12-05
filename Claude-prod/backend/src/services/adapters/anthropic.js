const BaseAdapter = require('./BaseAdapter');

class AnthropicAdapter extends BaseAdapter {
  transformMessages(messages) {
    // Claude format: separate system message, messages array without system role
    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content
      }));
    
    return claudeMessages;
  }

  buildRequestPayload(messages) {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    
    const payload = {
      model: this.modelName,
      max_tokens: this.config.max_tokens || 1024,
      messages: this.transformMessages(messages)
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    return payload;
  }

  getHeaders(apiKey) {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
  }

  extractResponse(responseData) {
    return responseData.content[0].text;
  }

  extractTokenCount(responseData) {
    return (responseData.usage?.input_tokens || 0) + 
           (responseData.usage?.output_tokens || 0);
  }
}

module.exports = AnthropicAdapter;