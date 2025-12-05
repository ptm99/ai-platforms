#!/bin/bash

# Manual Database Initialization Script
# Use this if automatic initialization didn't work

echo "🔧 Manually initializing database..."
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

# Check if init.sql exists
if [ ! -f "backend/init-db/init.sql" ]; then
    echo -e "${RED}❌ init.sql file not found at backend/init-db/init.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL container is running"
echo -e "${GREEN}✓${NC} init.sql file found"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will execute init.sql on the database.${NC}"
echo "If tables already exist, you may see errors (which is OK if using IF NOT EXISTS)."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Executing init.sql..."
echo ""

# Execute the SQL file
docker-compose exec -T postgres psql -U aiplatform -d aiplatform < backend/init-db/init.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Database initialization completed!${NC}"
    echo ""
    echo "Verifying..."
    ./check-db.sh
else
    echo ""
    echo -e "${RED}❌ Database initialization failed${NC}"
    echo ""
    echo "Check the error messages above for details."
    exit 1
fi