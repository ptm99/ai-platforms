#!/bin/bash

# AI Platform - Backend Structure Verification Script
# This script checks if all required files and folders exist

echo "🔍 Verifying AI Platform Backend Structure..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
FOUND=0
MISSING=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}✗${NC} $file ${YELLOW}(MISSING)${NC}"
        MISSING=$((MISSING + 1))
    fi
}

# Function to check if directory exists
check_dir() {
    local dir=$1
    TOTAL=$((TOTAL + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir/"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}✗${NC} $dir/ ${YELLOW}(MISSING)${NC}"
        MISSING=$((MISSING + 1))
    fi
}

echo "=== Root Level Files ==="
check_file "docker-compose.yml" "Docker orchestration"
echo ""

echo "=== Backend Root Files ==="
check_file "backend/Dockerfile" "Backend container config"
check_file "backend/package.json" "Node.js dependencies"
check_file "backend/.env" "Environment variables"
echo ""

echo "=== Database Initialization ==="
check_dir "backend/init-db"
check_file "backend/init-db/init.sql" "Database schema"
echo ""

echo "=== Source Root ==="
check_dir "backend/src"
check_file "backend/src/index.js" "Main entry point"
echo ""

echo "=== Configuration ==="
check_dir "backend/src/config"
check_file "backend/src/config/database.js" "Database connection"
echo ""

echo "=== Middleware ==="
check_dir "backend/src/middleware"
check_file "backend/src/middleware/auth.js" "JWT authentication middleware"
check_file "backend/src/middleware/errorHandler.js" "Error handler"
echo ""

echo "=== Utilities ==="
check_dir "backend/src/utils"
check_file "backend/src/utils/jwt.js" "JWT utilities"
check_file "backend/src/utils/password.js" "Password hashing"
echo ""

echo "=== Services ==="
check_dir "backend/src/services"
check_file "backend/src/services/aiProviders.js" "AI provider loader"
check_file "backend/src/services/keySelector.js" "API key selector"
check_file "backend/src/services/permissions.js" "Permission checker"
echo ""

echo "=== AI Provider Adapters ==="
check_dir "backend/src/services/adapters"
check_file "backend/src/services/adapters/BaseAdapter.js" "Base adapter class"
check_file "backend/src/services/adapters/openai.js" "ChatGPT adapter"
check_file "backend/src/services/adapters/anthropic.js" "Claude adapter"
check_file "backend/src/services/adapters/gemini.js" "Gemini adapter"
check_file "backend/src/services/adapters/deepseek.js" "DeepSeek adapter"
echo ""

echo "=== Routes ==="
check_dir "backend/src/routes"
check_file "backend/src/routes/auth.js" "Auth routes"
check_file "backend/src/routes/projects.js" "Project routes"
check_file "backend/src/routes/chats.js" "Chat routes"
check_file "backend/src/routes/permissions.js" "Permission routes"
check_file "backend/src/routes/providers.js" "Provider routes"
echo ""

echo "=== Background Jobs ==="
check_dir "backend/src/jobs"
check_file "backend/src/jobs/rateLimitReset.js" "Rate limit reset job"
echo ""

echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo -e "Total items checked: $TOTAL"
echo -e "${GREEN}Found: $FOUND${NC}"
echo -e "${RED}Missing: $MISSING${NC}"
echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All files and folders are present!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Review backend/.env file and update secrets"
    echo "2. Run: docker-compose up -d"
    echo "3. Check logs: docker-compose logs -f backend"
    echo "4. Test API: curl http://localhost/api/health"
    exit 0
else
    echo -e "${RED}⚠️  Some files or folders are missing!${NC}"
    echo ""
    echo "📝 To create missing files:"
    echo "1. Review the artifact file mapping guide"
    echo "2. Copy code from each artifact to the missing files"
    echo "3. Run this script again to verify"
    exit 1
fi