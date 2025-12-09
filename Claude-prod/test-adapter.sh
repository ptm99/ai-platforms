#!/bin/bash

# Test AI Provider Adapters
# This script helps debug adapter issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}AI Provider Adapter Testing${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not installed. Install for better output formatting.${NC}"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  macOS: brew install jq"
    echo ""
fi

# Get token
echo "First, login to get your token:"
echo ""
read -p "Username: " USERNAME
read -sp "Password: " PASSWORD
echo ""
echo ""

echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Login failed!${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Get providers
echo "Fetching available providers..."
PROVIDERS=$(curl -s http://localhost/api/providers \
  -H "Authorization: Bearer $TOKEN")

echo "$PROVIDERS" | jq . 2>/dev/null || echo "$PROVIDERS"
echo ""

# Check if any providers have keys
HAS_KEYS=$(echo "$PROVIDERS" | grep -o '"available_keys":[0-9]*' | grep -v ':0' | wc -l)

if [ "$HAS_KEYS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No API keys found!${NC}"
    echo ""
    echo "Please add an API key first:"
    echo "  1. Go to Admin tab in the web UI"
    echo "  2. Click 'API Keys' tab"
    echo "  3. Click 'Add API Key'"
    echo "  4. Select a provider and enter your API key"
    echo ""
    echo "Or use curl:"
    echo "  curl -X POST http://localhost/api/providers/keys \\"
    echo "    -H \"Authorization: Bearer \$TOKEN\" \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -d '{\"provider_id\": 1, \"key_value\": \"your-api-key\"}'"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Found providers with API keys${NC}"
echo ""

# Ask which provider to test
echo "Which provider would you like to test?"
echo "1. ChatGPT (OpenAI)"
echo "2. Claude (Anthropic)"
echo "3. Gemini (Google)"
echo "4. DeepSeek"
echo ""
read -p "Enter number (1-4): " PROVIDER_CHOICE

case $PROVIDER_CHOICE in
    1) PROVIDER_ID=1; PROVIDER_NAME="ChatGPT" ;;
    2) PROVIDER_ID=2; PROVIDER_NAME="Claude" ;;
    3) PROVIDER_ID=3; PROVIDER_NAME="Gemini" ;;
    4) PROVIDER_ID=4; PROVIDER_NAME="DeepSeek" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
echo "Testing $PROVIDER_NAME..."
echo ""

# Create a test project
echo "Creating test project..."
PROJECT_RESPONSE=$(curl -s -X POST http://localhost/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Adapter testing"}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project${NC}"
    echo "Response: $PROJECT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Project created (ID: $PROJECT_ID)${NC}"
echo ""

# Create a test chat
echo "Creating test chat with $PROVIDER_NAME..."
CHAT_RESPONSE=$(curl -s -X POST http://localhost/api/chats/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Chat - $PROVIDER_NAME\",\"provider_id\":$PROVIDER_ID}")

CHAT_ID=$(echo $CHAT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$CHAT_ID" ]; then
    echo -e "${RED}Failed to create chat${NC}"
    echo "Response: $CHAT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Chat created (ID: $CHAT_ID)${NC}"
echo ""

# Send a test message
echo "Sending test message: 'Hello! Can you respond with just the word OK?'"
echo ""

MESSAGE_RESPONSE=$(curl -s -X POST http://localhost/api/chats/$CHAT_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello! Can you respond with just the word OK?"}')

echo "Response:"
echo "$MESSAGE_RESPONSE" | jq . 2>/dev/null || echo "$MESSAGE_RESPONSE"
echo ""

# Check if successful
if echo "$MESSAGE_RESPONSE" | grep -q '"chat_status":"active"'; then
    echo -e "${GREEN}✅ SUCCESS! $PROVIDER_NAME adapter is working!${NC}"
    echo ""
    
    # Extract AI response
    AI_RESPONSE=$(echo "$MESSAGE_RESPONSE" | grep -o '"content":"[^"]*"' | tail -1 | cut -d'"' -f4)
    echo "AI Response: $AI_RESPONSE"
    echo ""
    
elif echo "$MESSAGE_RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ FAILED! Error from backend${NC}"
    echo ""
    ERROR_MSG=$(echo "$MESSAGE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo "Error: $ERROR_MSG"
    echo ""
    
    echo "Check backend logs for details:"
    echo "  docker-compose logs backend | tail -50"
    echo ""
    
else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
    echo ""
fi

# Cleanup option
echo ""
read -p "Delete test project? (y/N): " DELETE_PROJECT

if [[ $DELETE_PROJECT =~ ^[Yy]$ ]]; then
    curl -s -X DELETE http://localhost/api/projects/$PROJECT_ID \
      -H "Authorization: Bearer $TOKEN" > /dev/null
    echo -e "${GREEN}✓ Test project deleted${NC}"
fi

echo ""
echo "Testing complete!"