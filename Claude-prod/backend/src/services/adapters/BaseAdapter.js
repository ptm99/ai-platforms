const { AppError } = require('../../middleware/errorHandler');

/**
 * Base Adapter class that all AI provider adapters must extend
 * This ensures a consistent interface for all providers
 */
class BaseAdapter {
  constructor(provider) {
    this.provider = provider;
    this.name = provider.name;
    this.endpoint = provider.api_endpoint;
    this.modelName = provider.model_name;
    this.config = provider.config || {};
  }

  /**
   * Transform messages from our format to provider-specific format
   * Must be implemented by each adapter
   */
  transformMessages(messages) {
    throw new Error('transformMessages() must be implemented by adapter');
  }

  /**
   * Build the request payload for the provider
   * Must be implemented by each adapter
   */
  buildRequestPayload(messages) {
    throw new Error('buildRequestPayload() must be implemented by adapter');
  }

  /**
   * Get HTTP headers for the API request
   * Must be implemented by each adapter
   */
  getHeaders(apiKey) {
    throw new Error('getHeaders() must be implemented by adapter');
  }

  /**
   * Extract the response text from provider's response
   * Must be implemented by each adapter
   */
  extractResponse(responseData) {
    throw new Error('extractResponse() must be implemented by adapter');
  }

  /**
   * Extract token count from provider's response
   * Optional - defaults to 0 if not implemented
   */
  extractTokenCount(responseData) {
    return 0;
  }

  /**
   * Parse rate limit information from error response
   * Returns { resetAt: Date } or null
   */
  parseRateLimitError(error) {
    if (!error.response || error.response.status !== 429) {
      return null;
    }

    const resetTime = error.response.headers['x-ratelimit-reset'] || 
                     error.response.headers['retry-after'];
    
    let resetAt = new Date();
    if (resetTime) {
      // If it's a Unix timestamp
      if (resetTime.length > 10) {
        resetAt = new Date(parseInt(resetTime) * 1000);
      } else {
        // If it's seconds to wait
        resetAt = new Date(Date.now() + parseInt(resetTime) * 1000);
      }
    } else {
      // Default: 1 hour from now
      resetAt = new Date(Date.now() + 3600000);
    }
    
    return { resetAt };
  }

  /**
   * Handle API errors uniformly
   */
  handleError(error) {
    console.error(`${this.name} API Error:`, error.response?.data || error.message);
    
    if (error.response) {
      const status = error.response.status;
      
      // Rate limit errors
      if (status === 429) {
        const rateLimitInfo = this.parseRateLimitError(error);
        throw new AppError(429, 'rate_limited', 'API rate limit exceeded', rateLimitInfo);
      }
      
      // Authentication errors
      if (status === 401) {
        throw new AppError(401, 'invalid_api_key', 'Invalid API key');
      }
      
      // Other errors
      throw new AppError(
        status,
        'api_error',
        error.response.data?.error?.message || `${this.name} API error`
      );
    }
    
    // Network or other errors
    throw new AppError(503, 'service_unavailable', `${this.name} service unavailable`);
  }
}

module.exports = BaseAdapter;