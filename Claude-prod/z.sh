#!/bin/bash

# 1. First user registration (no token needed)
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response includes: is_admin: true, token

# 2. Add API keys (admin only)
curl -X POST http://localhost/api/providers/keys \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider_id":1,"key_value":"sk-..."}'

# 3. Create more users (admin only)
curl -X POST http://localhost/api/auth/register \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"user2","password":"pass123"}'

# 4. Regular users can now login and use the platform