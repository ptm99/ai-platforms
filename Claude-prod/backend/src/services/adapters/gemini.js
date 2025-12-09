const BaseAdapter = require('./BaseAdapter');

class GeminiAdapter extends BaseAdapter {
  transformMessages(messages) {
    // Gemini format: contents array with role 'user' or 'model'
    // System messages are not supported in the standard way, we'll prepend as user message
    const contents = [];
    
    // Handle system message by prepending to first user message
    const systemMsg = messages.find(m => m.role === 'system');
    let systemPrefix = systemMsg ? `${systemMsg.content}\n\n` : '';
    
    let firstUserMessage = true;
    
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      
      let content = msg.content;
      
      // Add system message to first user message
      if (firstUserMessage && msg.role === 'user' && systemPrefix) {
        content = systemPrefix + content;
        firstUserMessage = false;
      }
      
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }]
      });
    }
    
    return contents;
  }

  buildRequestPayload(messages) {
    const payload = {
      contents: this.transformMessages(messages)
    };
    
    // Add generation config if specified
    const generationConfig = {};
    
    if (this.config.temperature !== undefined) {
      generationConfig.temperature = this.config.temperature;
    }
    
    if (this.config.top_p !== undefined) {
      generationConfig.topP = this.config.top_p;
    }
    
    if (this.config.top_k !== undefined) {
      generationConfig.topK = this.config.top_k;
    }
    
    if (this.config.max_output_tokens !== undefined) {
      generationConfig.maxOutputTokens = this.config.max_output_tokens;
    }
    
    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }
    
    return payload;
  }

  getHeaders(apiKey) {
    // Gemini uses API key as query parameter, not in headers
    return {
      'Content-Type': 'application/json'
    };
  }

  // Override to add API key to URL
  getEndpoint(apiKey) {
    // Use the model name from config, default to gemini-pro
    const modelName = this.modelName || 'gemini-pro';
    
    // Construct the full URL with model and API key
    // Format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  }

  extractResponse(responseData) {
    // Validate response structure
    if (!responseData) {
      throw new Error('Invalid response format from Gemini: empty response');
    }
    
    if (!responseData.candidates || !Array.isArray(responseData.candidates)) {
      console.error('Invalid Gemini response structure:', JSON.stringify(responseData));
      throw new Error('Invalid response format from Gemini: missing candidates array');
    }
    
    if (responseData.candidates.length === 0) {
      throw new Error('Invalid response format from Gemini: empty candidates array');
    }
    
    const firstCandidate = responseData.candidates[0];
    
    if (!firstCandidate.content || !firstCandidate.content.parts || !Array.isArray(firstCandidate.content.parts)) {
      console.error('Invalid candidate structure:', JSON.stringify(firstCandidate));
      throw new Error('Invalid response format from Gemini: missing content parts');
    }
    
    if (firstCandidate.content.parts.length === 0) {
      throw new Error('Invalid response format from Gemini: empty parts array');
    }
    
    const firstPart = firstCandidate.content.parts[0];
    
    if (!firstPart.text) {
      console.error('Invalid part structure:', JSON.stringify(firstPart));
      throw new Error('Invalid response format from Gemini: missing text in part');
    }
    
    return firstPart.text;
  }

  extractTokenCount(responseData) {
    // Gemini returns token count in usageMetadata
    if (!responseData.usageMetadata) return 0;
    
    return responseData.usageMetadata.totalTokenCount || 0;
  }
}

module.exports = GeminiAdapter;