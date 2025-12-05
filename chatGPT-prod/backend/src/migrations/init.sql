CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- providers table
CREATE TABLE IF NOT EXISTS providers(
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL, -- e.g. openai, gemini, claude
  display_name text,
  base_url text,
  api_key text,
  model_map jsonb,
  created_at timestamptz default now()
);

-- seed sample providers (api_key empty - set in DB or .env)
INSERT INTO providers (name, display_name, base_url, api_key, model_map)
VALUES
('openai','OpenAI','https://api.openai.com/v1',NULL,'{}'),
('gemini','Google Gemini','https://generativelanguage.googleapis.com/v1',NULL,'{}'),
('claude','Anthropic Claude','https://api.anthropic.com/v1',NULL,'{}')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text UNIQUE NOT NULL,
 password_hash text NOT NULL,
 role text DEFAULT 'user',
 credits numeric DEFAULT 0,
 created_at timestamptz
);

CREATE TABLE IF NOT EXISTS projects(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES users(id),
 name text,
 provider_id integer REFERENCES providers(id),
 model text,
 visibility text DEFAULT 'private',
 created_at timestamptz
);

CREATE TABLE IF NOT EXISTS messages(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid REFERENCES projects(id),
 user_id uuid REFERENCES users(id),
 role text,
 content text,
 model text,
 tokens_used integer,
 cost numeric,
 created_at timestamptz
);

CREATE TABLE IF NOT EXISTS usage_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES users(id),
 project_id uuid REFERENCES projects(id),
 model text,
 tokens integer,
 cost numeric,
 request_id text,
 created_at timestamptz
);