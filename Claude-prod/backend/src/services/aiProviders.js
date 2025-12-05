const axios = require('axios');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Cache for loaded adapters
const adapterCache = {};

/**
 * Dynamically load an adapter module
 */
const loadAdapter = (adapterModule) => {
  // Check cache first
  if (adapterCache[adapterModule]) {
    return adapterCache[adapterModule];
  }

  try {
    const adapterPath = path.join(__dirname, 'adapters', `${adapterModule}.js`);
    
    // Check if adapter file exists
    if (!fs.existsSync(adapterPath)) {
      throw new Error(`Adapter module '${adapterModule}' not found`);
    }

    // Load the adapter class
    const AdapterClass = require(adapterPath);
    
    // Cache it
    adapterCache[adapterModule] = AdapterClass;
    
    return AdapterClass;
  } catch (error) {
    console.error(`Failed to load adapter '${adapterModule}':`, error);
    throw new AppError(500, 'adapter_load_error', `Failed to load AI provider adapter: ${adapterModule}`);
  }
};

/**
 * Get provider details from database
 */
const getProviderById = async (providerId) => {
  const result = await pool.query(
    'SELECT * FROM ai_providers WHERE id = $1',
    [providerId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'not_found', 'AI provider not found');
  }

  return result.rows[0];
};

/**
 * Get provider details by name
 */
const getProviderByName = async (providerName) => {
  const result = await pool.query(
    'SELECT * FROM ai_providers WHERE name = $1',
    [providerName]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'not_found', 'AI provider not found');
  }

  return result.rows[0];
};

/**
 * Main function to call any AI provider dynamically
 */
const callAIProvider = async (providerName, apiKey, messages) => {
  try {
    // Get provider configuration from database
    const provider = await getProviderByName(providerName);

    if (!provider.is_active) {
      throw new AppError(400, 'provider_inactive', 'This AI provider is currently inactive');
    }

    // Load the appropriate adapter
    const AdapterClass = loadAdapter(provider.adapter_module);
    
    // Create adapter instance with provider config
    const adapter = new AdapterClass(provider);

    // Build request
    const payload = adapter.buildRequestPayload(messages);
    const headers = adapter.getHeaders(apiKey);
    
    // Determine endpoint (some adapters may customize it)
    const endpoint = adapter.getEndpoint ? adapter.getEndpoint(apiKey) : adapter.endpoint;

    // Make API request
    const response = await axios.post(endpoint, payload, { headers });

    // Extract response and token count
    const content = adapter.extractResponse(response.data);
    const tokenCount = adapter.extractTokenCount(response.data);

    return {
      content,
      tokenCount
    };

  } catch (error) {
    // If it's already an AppError, just rethrow
    if (error.error) {
      throw error;
    }

    // Handle API errors through adapter
    if (error.response) {
      const provider = await getProviderByName(providerName);
      const AdapterClass = loadAdapter(provider.adapter_module);
      const adapter = new AdapterClass(provider);
      adapter.handleError(error);
    }

    // Network or other errors
    throw new AppError(503, 'service_unavailable', `Failed to communicate with ${providerName}`);
  }
};

/**
 * List all available adapters in the adapters directory
 */
const listAvailableAdapters = () => {
  const adaptersDir = path.join(__dirname, 'adapters');
  
  try {
    const files = fs.readdirSync(adaptersDir);
    return files
      .filter(file => file.endsWith('.js') && file !== 'BaseAdapter.js')
      .map(file => file.replace('.js', ''));
  } catch (error) {
    console.error('Error reading adapters directory:', error);
    return [];
  }
};

/**
 * Validate that a provider configuration is complete and has a valid adapter
 */
const validateProviderConfig = async (config) => {
  const { name, display_name, adapter_module } = config;

  if (!name || !display_name || !adapter_module) {
    throw new AppError(400, 'validation_error', 'Provider name, display_name, and adapter_module are required');
  }

  // Check if adapter exists
  const availableAdapters = listAvailableAdapters();
  if (!availableAdapters.includes(adapter_module)) {
    throw new AppError(400, 'invalid_adapter', `Adapter '${adapter_module}' does not exist. Available: ${availableAdapters.join(', ')}`);
  }

  return true;
};

module.exports = {
  callAIProvider,
  getProviderById,
  getProviderByName,
  listAvailableAdapters,
  validateProviderConfig
};