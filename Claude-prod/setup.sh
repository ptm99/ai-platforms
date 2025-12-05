#!/bin/bash

# AI Platform - Backend Setup Script
# This script creates the complete directory structure

echo "🚀 Creating AI Platform Backend Structure..."

# Create root directory
mkdir -p ai-platform
cd ai-platform

# Create backend directories
echo "📁 Creating directory structure..."
mkdir -p backend/src/{config,middleware,utils,services/adapters,routes,jobs}
mkdir -p backend/init-db

echo "✅ Directory structure created!"

# List the structure
echo ""
echo "📂 Created structure:"
tree backend -L 3 2>/dev/null || find backend -type d 2>/dev/null

echo ""
echo "✅ Backend structure is ready!"
echo ""
echo "📝 Next steps:"
echo "1. Copy all code files from the artifacts into their respective locations"
echo "2. Create backend/.env file with your configuration"
echo "3. Place docker-compose.yml in the project root"
echo "4. Run: docker-compose up -d"
echo ""
echo "📍 File locations you need to populate:"
echo ""
echo "Root level:"
echo "  - docker-compose.yml"
echo ""
echo "backend/:"
echo "  - Dockerfile"
echo "  - package.json"
echo "  - .env"
echo ""
echo "backend/init-db/:"
echo "  - init.sql"
echo ""
echo "backend/src/:"
echo "  - index.js"
echo ""
echo "backend/src/config/:"
echo "  - database.js"
echo ""
echo "backend/src/middleware/:"
echo "  - auth.js"
echo "  - errorHandler.js"
echo ""
echo "backend/src/utils/:"
echo "  - jwt.js"
echo "  - password.js"
echo ""
echo "backend/src/services/:"
echo "  - aiProviders.js"
echo "  - keySelector.js"
echo "  - permissions.js"
echo ""
echo "backend/src/services/adapters/:"
echo "  - BaseAdapter.js"
echo "  - openai.js"
echo "  - anthropic.js"
echo "  - gemini.js"
echo "  - deepseek.js"
echo ""
echo "backend/src/routes/:"
echo "  - auth.js"
echo "  - projects.js"
echo "  - chats.js"
echo "  - permissions.js"
echo "  - providers.js"
echo ""
echo "backend/src/jobs/:"
echo "  - rateLimitReset.js"
echo ""
echo "Happy coding! 🎉"