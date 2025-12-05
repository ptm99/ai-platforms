#!/bin/bash

# Database Initialization Check Script

echo "🔍 Checking PostgreSQL database initialization..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if docker-compose is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ PostgreSQL container is not running${NC}"
    echo ""
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL container is running"
echo ""

# Function to run SQL query
run_query() {
    docker-compose exec -T postgres psql -U aiplatform -d aiplatform -t -c "$1" 2>/dev/null
}

echo "Checking database tables..."
echo ""

# Check each table
tables=("users" "ai_providers" "api_keys" "projects" "chat_sessions" "messages" "permissions")
all_exist=true

for table in "${tables[@]}"; do
    result=$(run_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
    if echo "$result" | grep -q "t"; then
        echo -e "${GREEN}✓${NC} Table '$table' exists"
    else
        echo -e "${RED}✗${NC} Table '$table' is MISSING"
        all_exist=false
    fi
done

echo ""

if [ "$all_exist" = true ]; then
    echo -e "${GREEN}✅ Database is properly initialized!${NC}"
    echo ""
    
    # Check if default providers exist
    provider_count=$(run_query "SELECT COUNT(*) FROM ai_providers;")
    provider_count=$(echo $provider_count | tr -d '[:space:]')
    
    if [ "$provider_count" -gt 0 ]; then
        echo "📋 AI Providers in database: $provider_count"
        echo ""
        run_query "SELECT id, name, display_name, is_active FROM ai_providers ORDER BY id;"
        echo ""
        echo -e "${GREEN}✅ Default providers loaded!${NC}"
    else
        echo -e "${YELLOW}⚠️  No AI providers found. Default data may not have loaded.${NC}"
        echo ""
        echo "Run this to load default providers:"
        echo "  ./init-db-manual.sh"
    fi
    
    exit 0
else
    echo -e "${RED}❌ Database initialization failed or incomplete${NC}"
    echo ""
    echo "This can happen if:"
    echo "  1. The database volume already existed before init.sql ran"
    echo "  2. There was an error in init.sql"
    echo "  3. File permissions prevent reading init.sql"
    echo ""
    echo "🔧 To fix this:"
    echo ""
    echo "Option 1: Reset and reinitialize (DESTROYS ALL DATA)"
    echo "  docker-compose down -v"
    echo "  docker-compose up -d"
    echo ""
    echo "Option 2: Manually initialize (keeps existing data)"
    echo "  ./init-db-manual.sh"
    echo ""
    exit 1
fi