CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  VARCHAR(255),
  role          VARCHAR(32) NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_role CHECK (role IN ('user','admin','superadmin'))
);

-- SESSIONS (refresh tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent         TEXT,
  ip_address         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  last_refreshed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- AI PROVIDERS
CREATE TABLE IF NOT EXISTS ai_providers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  adapter_file VARCHAR(255) NOT NULL,
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  description  TEXT,
  logo_url     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MODELS
CREATE TABLE IF NOT EXISTS ai_provider_models (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id    UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_name     VARCHAR(255) NOT NULL,
  context_length INTEGER,
  is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, model_name)
);

-- KEYS
CREATE TABLE IF NOT EXISTS ai_provider_keys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id    UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id       UUID NOT NULL REFERENCES ai_provider_models(id) ON DELETE CASCADE,
  api_key_enc    TEXT NOT NULL,
  name           VARCHAR(255),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  daily_limit    INTEGER NOT NULL DEFAULT 1000000,
  daily_usage    INTEGER NOT NULL DEFAULT 0,
  last_reset_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_DATE,
  last_used_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_keys_status CHECK (status IN ('active','exhausted','disabled')),
  CONSTRAINT chk_keys_daily_limit CHECK (daily_limit >= 0),
  CONSTRAINT chk_keys_daily_usage CHECK (daily_usage >= 0),
  UNIQUE(model_id, api_key_enc)
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  visibility      VARCHAR(20) NOT NULL DEFAULT 'private',
  provider_id     UUID NOT NULL REFERENCES ai_providers(id),
  model_id        UUID NOT NULL REFERENCES ai_provider_models(id),
  provider_key_id UUID NOT NULL REFERENCES ai_provider_keys(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_projects_visibility CHECK (visibility IN ('private','shared','public'))
);

-- MEMBERS
CREATE TABLE IF NOT EXISTS project_members (
  id           BIGSERIAL PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission   VARCHAR(20) NOT NULL DEFAULT 'read',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_project_members_permission CHECK (permission IN ('read','edit')),
  CONSTRAINT uq_project_members UNIQUE (project_id, user_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  role          VARCHAR(20) NOT NULL,
  content       JSONB NOT NULL,
  provider_code VARCHAR(50),
  model_name    VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_messages_role CHECK (role IN ('user','assistant','system'))
);

-- USAGE LOGS
CREATE TABLE IF NOT EXISTS usage_logs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  provider_id     UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  model_id        UUID REFERENCES ai_provider_models(id) ON DELETE SET NULL,
  provider_key_id UUID REFERENCES ai_provider_keys(id) ON DELETE SET NULL,
  tokens_in       INTEGER NOT NULL DEFAULT 0,
  tokens_out      INTEGER NOT NULL DEFAULT 0,
  cost            NUMERIC(10,4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_usage_tokens_in CHECK (tokens_in >= 0),
  CONSTRAINT chk_usage_tokens_out CHECK (tokens_out >= 0)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

DROP TRIGGER IF EXISTS trg_providers_updated ON ai_providers;
CREATE TRIGGER trg_providers_updated
BEFORE UPDATE ON ai_providers
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- seed providers (idempotent)
INSERT INTO ai_providers (code, display_name, adapter_file, description)
VALUES
 ('openai',   'OpenAI',        'openai.adapter',   'OpenAI models'),
 ('gemini',   'Google Gemini', 'gemini.adapter',   'Gemini models'),
 ('claude',   'Anthropic',     'claude.adapter',   'Claude models'),
 ('deepseek', 'DeepSeek',      'deepseek.adapter', 'DeepSeek models')
ON CONFLICT (code) DO NOTHING;
