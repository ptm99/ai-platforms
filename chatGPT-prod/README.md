# Multi-tenant OpenAI Proxy (Multi-Provider)

This fork extends the original template to support multiple LLM providers (OpenAI, Gemini, Claude), adds:
- Token estimation & saving usage records when provider doesn't return usage
- Frontend provider selection when creating projects
- Provider list endpoint and providers table seeded in DB
- Docker Compose setup

## Quick start

1. Copy env: `cp backend/.env.example backend/.env` and set API keys if desired.
2. Start services: `docker compose up --build`
3. Backend: http://localhost:3000, Frontend: http://localhost:5173

Notes:
- Pricing calc is a placeholder (tokens * 0.000002).
- Set provider API keys in DB `providers.api_key` or via environment variables.
