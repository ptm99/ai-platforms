-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Providers table
CREATE TABLE IF NOT EXISTS ai_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(255),
    model_name VARCHAR(100),
    adapter_module VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE CASCADE,
    key_value VARCHAR(255) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    rate_limit_reset_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(20) NOT NULL,
    resource_id INTEGER NOT NULL,
    permission_level VARCHAR(20) NOT NULL,
    granted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_type, resource_id)
);

-- Indexes
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_chat_sessions_project ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_owner ON chat_sessions(owner_id);
CREATE INDEX idx_messages_chat_session ON messages(chat_session_id);
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_type, resource_id);
CREATE INDEX idx_api_keys_provider ON api_keys(provider_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_usage ON api_keys(provider_id, usage_count, status);

-- Insert default AI providers
INSERT INTO ai_providers (name, display_name, api_endpoint) VALUES
    ('chatgpt', 'ChatGPT', 'https://api.openai.com/v1/chat/completions'),
    ('claude', 'Claude', 'https://api.anthropic.com/v1/messages'),
    ('gemini', 'Gemini', 'https://generativelanguage.googleapis.com/v1/models'),
    ('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1/chat/completions');