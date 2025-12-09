-- Update AI Providers with Optimal Configurations
-- Run this to fix provider settings

-- OpenAI (ChatGPT)
-- Temperature: 0.7 (balanced creativity)
-- Max tokens: 2000 (longer responses)
UPDATE ai_providers 
SET config = '{
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 1.0,
  "frequency_penalty": 0,
  "presence_penalty": 0
}'::jsonb
WHERE name = 'chatgpt';

-- Anthropic (Claude)
-- Max tokens: 4096 (Claude can handle long responses)
-- Temperature: 0.7
UPDATE ai_providers 
SET config = '{
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 0.9
}'::jsonb
WHERE name = 'claude';

-- Google (Gemini)
-- Temperature: 0.7
-- Max output tokens: 2048
-- Top P: 0.95 (slightly higher for creativity)
UPDATE ai_providers 
SET config = '{
  "temperature": 0.7,
  "max_output_tokens": 2048,
  "top_p": 0.95,
  "top_k": 40
}'::jsonb
WHERE name = 'gemini';

-- DeepSeek
-- Temperature: 0.7
-- Max tokens: 2000
UPDATE ai_providers 
SET config = '{
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 0.95
}'::jsonb
WHERE name = 'deepseek';

-- Verify the updates
SELECT 
  name,
  display_name,
  model_name,
  config
FROM ai_providers
ORDER BY id;