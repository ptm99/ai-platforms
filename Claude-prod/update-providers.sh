#!/bin/bash

# Update AI Providers Configuration Script

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header "Update AI Provider Configurations"

echo "This script will update the configuration for all AI providers"
echo "with optimized settings for better performance."
echo ""

# Check if PostgreSQL is running
if ! docker-compose ps postgres | grep -q "Up"; then
    print_error "PostgreSQL container is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi

print_success "PostgreSQL is running"
echo ""

echo "Current provider configurations:"
echo ""
docker-compose exec -T postgres psql -U aiplatform -d aiplatform << 'EOF'
SELECT 
  name,
  model_name,
  config
FROM ai_providers
ORDER BY id;
EOF

echo ""
read -p "Do you want to update these configurations? (y/N): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Updating configurations..."
echo ""

# Apply updates
docker-compose exec -T postgres psql -U aiplatform -d aiplatform << 'EOF'

-- OpenAI (ChatGPT)
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
UPDATE ai_providers 
SET config = '{
  "max_tokens": 4096,
  "temperature": 0.7,
  "top_p": 0.9
}'::jsonb
WHERE name = 'claude';

-- Google (Gemini)
UPDATE ai_providers 
SET config = '{
  "temperature": 0.7,
  "max_output_tokens": 2048,
  "top_p": 0.95,
  "top_k": 40
}'::jsonb
WHERE name = 'gemini';

-- DeepSeek
UPDATE ai_providers 
SET config = '{
  "temperature": 0.7,
  "max_tokens": 2000,
  "top_p": 0.95
}'::jsonb
WHERE name = 'deepseek';

EOF

if [ $? -eq 0 ]; then
    print_success "Configurations updated successfully"
    echo ""
    echo "New configurations:"
    echo ""
    docker-compose exec -T postgres psql -U aiplatform -d aiplatform << 'EOF'
SELECT 
  name,
  model_name,
  config
FROM ai_providers
ORDER BY id;
EOF
    echo ""
    print_success "Update complete!"
    echo ""
    echo "Next steps:"
    echo "1. Restart backend: docker-compose restart backend"
    echo "2. Test adapters: ./test-adapter.sh"
else
    print_error "Update failed"
    exit 1
fi