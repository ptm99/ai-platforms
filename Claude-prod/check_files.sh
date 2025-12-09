#!/bin/bash

# Complete File Verification Script
# Checks all backend and frontend files

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL=0
FOUND=0
MISSING=0

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_file() {
    local file=$1
    TOTAL=$((TOTAL + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}✗${NC} $file ${YELLOW}(MISSING)${NC}"
        MISSING=$((MISSING + 1))
    fi
}

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

print_header "AI Platform - Complete File Verification"

echo "Checking all project files..."
echo ""

# ============================================================================
# ROOT LEVEL FILES
# ============================================================================

print_header "ROOT LEVEL FILES"

check_file "docker-compose.yml"

echo ""
echo "Scripts:"
check_file "setup.sh"
check_file "check.sh"
check_file "check-db.sh"
check_file "init-db-manual.sh"
check_file "deploy.sh"
check_file "backup.sh"
check_file "restore.sh"
check_file "rollback.sh"
check_file "list-backups.sh"
check_file "cleanup-backups.sh"

# ============================================================================
# BACKEND FILES
# ============================================================================

print_header "BACKEND - Root Files"

check_file "backend/Dockerfile"
check_file "backend/package.json"
check_file "backend/.env"

print_header "BACKEND - Database"

check_dir "backend/init-db"
check_file "backend/init-db/init.sql"

print_header "BACKEND - Source Root"

check_dir "backend/src"
check_file "backend/src/index.js"

print_header "BACKEND - Configuration"

check_dir "backend/src/config"
check_file "backend/src/config/database.js"

print_header "BACKEND - Middleware"

check_dir "backend/src/middleware"
check_file "backend/src/middleware/auth.js"
check_file "backend/src/middleware/errorHandler.js"

print_header "BACKEND - Utilities"

check_dir "backend/src/utils"
check_file "backend/src/utils/jwt.js"
check_file "backend/src/utils/password.js"

print_header "BACKEND - Services"

check_dir "backend/src/services"
check_file "backend/src/services/aiProviders.js"
check_file "backend/src/services/keySelector.js"
check_file "backend/src/services/permissions.js"

print_header "BACKEND - AI Provider Adapters"

check_dir "backend/src/services/adapters"
check_file "backend/src/services/adapters/BaseAdapter.js"
check_file "backend/src/services/adapters/openai.js"
check_file "backend/src/services/adapters/anthropic.js"
check_file "backend/src/services/adapters/gemini.js"
check_file "backend/src/services/adapters/deepseek.js"

print_header "BACKEND - Routes"

check_dir "backend/src/routes"
check_file "backend/src/routes/auth.js"
check_file "backend/src/routes/projects.js"
check_file "backend/src/routes/chats.js"
check_file "backend/src/routes/permissions.js"
check_file "backend/src/routes/providers.js"

print_header "BACKEND - Background Jobs"

check_dir "backend/src/jobs"
check_file "backend/src/jobs/rateLimitReset.js"

# ============================================================================
# FRONTEND FILES
# ============================================================================

print_header "FRONTEND - Root Files"

check_file "frontend/Dockerfile"
check_file "frontend/package.json"
check_file "frontend/nginx.conf"
check_file "frontend/vite.config.js"
check_file "frontend/tailwind.config.js"
check_file "frontend/postcss.config.js"
check_file "frontend/index.html"

print_header "FRONTEND - Source Root"

check_dir "frontend/src"
check_file "frontend/src/main.jsx"
check_file "frontend/src/App.jsx"
check_file "frontend/src/index.css"

print_header "FRONTEND - API Client"

check_dir "frontend/src/api"
check_file "frontend/src/api/client.js"

print_header "FRONTEND - Contexts"

check_dir "frontend/src/contexts"
check_file "frontend/src/contexts/AuthContext.jsx"

print_header "FRONTEND - Components"

check_dir "frontend/src/components"
check_file "frontend/src/components/Layout.jsx"
check_file "frontend/src/components/ProtectedRoute.jsx"

print_header "FRONTEND - UI Components"

check_dir "frontend/src/components/ui"
check_file "frontend/src/components/ui/Button.jsx"
check_file "frontend/src/components/ui/Input.jsx"
check_file "frontend/src/components/ui/Card.jsx"
check_file "frontend/src/components/ui/Modal.jsx"
check_file "frontend/src/components/ui/Loading.jsx"

print_header "FRONTEND - Pages"

check_dir "frontend/src/pages"
check_file "frontend/src/pages/Login.jsx"
check_file "frontend/src/pages/Dashboard.jsx"
check_file "frontend/src/pages/Project.jsx"
check_file "frontend/src/pages/Chat.jsx"
check_file "frontend/src/pages/Profile.jsx"
check_file "frontend/src/pages/Admin.jsx"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo -e "Total items checked: $TOTAL"
echo -e "${GREEN}Found: $FOUND${NC}"
echo -e "${RED}Missing: $MISSING${NC}"
echo ""

# Calculate percentages
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((FOUND * 100 / TOTAL))
    echo "Completion: ${PERCENTAGE}%"
    echo ""
fi

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All files are present!${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Make all scripts executable:"
    echo "   chmod +x *.sh"
    echo ""
    echo "2. Review backend/.env and update secrets"
    echo ""
    echo "3. Deploy the system:"
    echo "   ./deploy.sh"
    echo ""
    echo "4. Or start manually:"
    echo "   docker-compose up -d"
    echo ""
    echo "📦 File Summary:"
    echo "   Backend:  29 files"
    echo "   Frontend: 25 files"
    echo "   Scripts:  10 files"
    echo "   Config:   1 file (docker-compose.yml)"
    echo "   Total:    65 files"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some files are missing!${NC}"
    echo ""
    echo "📝 To create missing files:"
    echo ""
    echo "1. Review the 'Artifact to File Mapping Guide'"
    echo "2. Copy code from each artifact to the missing files"
    echo "3. Run this script again to verify"
    echo ""
    echo "Missing files by category:"
    echo ""
    
    # Count missing by category
    MISSING_BACKEND=0
    MISSING_FRONTEND=0
    MISSING_SCRIPTS=0
    MISSING_ROOT=0
    
    if [ ! -f "docker-compose.yml" ]; then
        MISSING_ROOT=$((MISSING_ROOT + 1))
    fi
    
    for script in setup.sh check.sh check-db.sh init-db-manual.sh deploy.sh backup.sh restore.sh rollback.sh list-backups.sh cleanup-backups.sh; do
        if [ ! -f "$script" ]; then
            MISSING_SCRIPTS=$((MISSING_SCRIPTS + 1))
        fi
    done
    
    # Check backend files
    for file in backend/Dockerfile backend/package.json backend/.env backend/init-db/init.sql backend/src/index.js backend/src/config/database.js backend/src/middleware/auth.js backend/src/middleware/errorHandler.js backend/src/utils/jwt.js backend/src/utils/password.js backend/src/services/aiProviders.js backend/src/services/keySelector.js backend/src/services/permissions.js backend/src/services/adapters/BaseAdapter.js backend/src/services/adapters/openai.js backend/src/services/adapters/anthropic.js backend/src/services/adapters/gemini.js backend/src/services/adapters/deepseek.js backend/src/routes/auth.js backend/src/routes/projects.js backend/src/routes/chats.js backend/src/routes/permissions.js backend/src/routes/providers.js backend/src/jobs/rateLimitReset.js; do
        if [ ! -f "$file" ]; then
            MISSING_BACKEND=$((MISSING_BACKEND + 1))
        fi
    done
    
    # Check frontend files
    for file in frontend/Dockerfile frontend/package.json frontend/nginx.conf frontend/vite.config.js frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src/main.jsx frontend/src/App.jsx frontend/src/index.css frontend/src/api/client.js frontend/src/contexts/AuthContext.jsx frontend/src/components/Layout.jsx frontend/src/components/ProtectedRoute.jsx frontend/src/components/ui/Button.jsx frontend/src/components/ui/Input.jsx frontend/src/components/ui/Card.jsx frontend/src/components/ui/Modal.jsx frontend/src/components/ui/Loading.jsx frontend/src/pages/Login.jsx frontend/src/pages/Dashboard.jsx frontend/src/pages/Project.jsx frontend/src/pages/Chat.jsx frontend/src/pages/Profile.jsx frontend/src/pages/Admin.jsx; do
        if [ ! -f "$file" ]; then
            MISSING_FRONTEND=$((MISSING_FRONTEND + 1))
        fi
    done
    
    if [ $MISSING_ROOT -gt 0 ]; then
        echo "  Root files:    ${MISSING_ROOT}"
    fi
    if [ $MISSING_SCRIPTS -gt 0 ]; then
        echo "  Scripts:       ${MISSING_SCRIPTS}"
    fi
    if [ $MISSING_BACKEND -gt 0 ]; then
        echo "  Backend:       ${MISSING_BACKEND}"
    fi
    if [ $MISSING_FRONTEND -gt 0 ]; then
        echo "  Frontend:      ${MISSING_FRONTEND}"
    fi
    echo ""
    
    exit 1
fi