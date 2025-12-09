const BaseAdapter = require('./BaseAdapter');

class AnthropicAdapter extends BaseAdapter {
  transformMessages(messages) {
    // Claude requires alternating user/assistant messages
    // System messages are handled separately
    // Filter out system messages and ensure proper format
    const filteredMessages = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handle separately
      
      // Claude only accepts 'user' and 'assistant' roles
      if (msg.role === 'user' || msg.role === 'assistant') {
        filteredMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    return filteredMessages;
  }

  buildRequestPayload(messages) {
    // Extract system message if present (Claude handles it separately)
    const systemMessage = messages.find(m => m.role === 'system');
    
    const payload = {
      model: this.modelName || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.max_tokens || 4096,
      messages: this.transformMessages(messages)
    };

    // Add system message if exists
    if (systemMessage && systemMessage.content) {
      payload.system = systemMessage.content;
    }

    // Add optional parameters from config
    if (this.config.temperature !== undefined) {
      payload.temperature = this.config.temperature;
    }
    
    if (this.config.top_p !== undefined) {
      payload.top_p = this.config.top_p;
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
    // Validate response structure
    if (!responseData || !responseData.content || !Array.isArray(responseData.content)) {
      console.error('Invalid Anthropic response structure:', JSON.stringify(responseData));
      throw new Error('Invalid response format from Anthropic: missing content array');
    }
    
    if (responseData.content.length === 0) {
      throw new Error('Invalid response format from Anthropic: empty content array');
    }
    
    const firstContent = responseData.content[0];
    if (!firstContent || firstContent.type !== 'text' || !firstContent.text) {
      console.error('Invalid content structure:', JSON.stringify(firstContent));
      throw new Error('Invalid response format from Anthropic: expected text content');
    }
    
    return firstContent.text;
  }

  extractTokenCount(responseData) {
    if (!responseData.usage) return 0;
    const inputTokens = responseData.usage.input_tokens || 0;
    const outputTokens = responseData.usage.output_tokens || 0;
    return inputTokens + outputTokens;
  }
}

module.exports = AnthropicAdapter;