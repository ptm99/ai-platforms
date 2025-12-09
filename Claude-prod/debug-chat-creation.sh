#!/bin/bash

# Debug Chat Creation Issue

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Debug: Chat Creation Issue${NC}"
echo ""

# Step 1: Login
echo "Step 1: Login"
read -p "Username: " USERNAME
read -sp "Password: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token' 2>/dev/null)
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user_id' 2>/dev/null)
IS_ADMIN=$(echo $LOGIN_RESPONSE | jq -r '.is_admin' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Login failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "User ID: $USER_ID"
echo "Is Admin: $IS_ADMIN"
echo "Token (first 20 chars): ${TOKEN:0:20}..."
echo ""

# Step 2: Check providers and keys
echo "Step 2: Check available providers and keys"
PROVIDERS_RESPONSE=$(curl -s http://localhost/api/providers \
  -H "Authorization: Bearer $TOKEN")

echo "Providers response:"
echo "$PROVIDERS_RESPONSE" | jq . 2>/dev/null || echo "$PROVIDERS_RESPONSE"
echo ""

# Check if we got 401
if echo "$PROVIDERS_RESPONSE" | grep -q "unauthorized"; then
    echo -e "${RED}Got 401 on providers endpoint!${NC}"
    echo "This means token is invalid or backend auth is broken"
    exit 1
fi

# Step 3: Create project
echo "Step 3: Create test project"
PROJECT_RESPONSE=$(curl -s -X POST http://localhost/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Debug Test Project","description":"Testing chat creation"}')

echo "Project creation response:"
echo "$PROJECT_RESPONSE" | jq . 2>/dev/null || echo "$PROJECT_RESPONSE"
echo ""

PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id' 2>/dev/null)

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project created${NC}"
echo "Project ID: $PROJECT_ID"
echo ""

# Step 4: Verify project permission
echo "Step 4: Get project details"
PROJECT_DETAILS=$(curl -s http://localhost/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Project details:"
echo "$PROJECT_DETAILS" | jq . 2>/dev/null || echo "$PROJECT_DETAILS"
echo ""

# Step 5: Create chat
echo "Step 5: Create chat with ChatGPT (provider_id: 1)"
echo "Request URL: POST /api/chats/project/$PROJECT_ID"
echo "Request body:"
echo '{"title":"Debug Test Chat","provider_id":1}' | jq .
echo ""

CHAT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  -X POST http://localhost/api/chats/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Debug Test Chat","provider_id":1}')

HTTP_STATUS=$(echo "$CHAT_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$CHAT_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" == "401" ]; then
    echo -e "${RED}❌ GOT 401 UNAUTHORIZED!${NC}"
    echo ""
    echo "This is the problem! Backend is rejecting the token."
    echo ""
    echo "Possible causes:"
    echo "1. Token not being sent correctly"
    echo "2. Auth middleware rejecting token"
    echo "3. Permission check failing"
    echo ""
    echo "Check backend logs:"
    echo "  docker-compose logs backend | tail -50"
    echo ""
    
elif [ "$HTTP_STATUS" == "201" ]; then
    echo -e "${GREEN}✅ Chat created successfully!${NC}"
    CHAT_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    echo "Chat ID: $CHAT_ID"
    echo ""
    echo "Chat creation works! The issue might be in the frontend."
    echo ""
    
elif [ "$HTTP_STATUS" == "503" ]; then
    echo -e "${YELLOW}⚠️  No available API keys${NC}"
    echo ""
    echo "You need to add an API key for ChatGPT first."
    echo ""
    
else
    echo -e "${RED}❌ Unexpected status: $HTTP_STATUS${NC}"
    echo ""
fi

# Check backend logs
echo "Recent backend logs:"
echo ""
docker-compose logs backend --tail=20

echo ""
echo "Debug complete!"