#!/bin/bash

# AI Platform - Master Deployment Script
# This script orchestrates the entire setup and deployment process

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to print step
print_step() {
    echo -e "${BLUE}➜${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to ask yes/no question
ask_yes_no() {
    while true; do
        read -p "$(echo -e ${YELLOW}$1 [y/N]: ${NC})" yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            "" ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Banner
clear
echo -e "${MAGENTA}"
cat << "EOF"
    ___    ____   ____  __      __  ____                 
   /   |  /  _/  / __ \/ /___ _/ /_/ __/___  _________ ___
  / /| |  / /   / /_/ / / __ `/ __/ /_/ __ \/ ___/ __ `__ \
 / ___ |_/ /   / ____/ / /_/ / /_/ __/ /_/ / /  / / / / / /
/_/  |_/___/  /_/   /_/\__,_/\__/_/  \____/_/  /_/ /_/ /_/ 
                                                            
        Multi-User AI API Sharing Platform
EOF
echo -e "${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# STEP 1: Pre-flight Checks
# ============================================================================

print_header "STEP 1: Pre-flight Checks"

print_step "Checking required commands..."

# Check Docker
if command -v docker &> /dev/null; then
    print_success "Docker is installed"
else
    print_error "Docker is not installed"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    print_success "Docker Compose is installed"
else
    print_error "Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if docker info &> /dev/null; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    echo "Please start Docker and try again"
    exit 1
fi

# ============================================================================
# STEP 2: File Structure Verification
# ============================================================================

print_header "STEP 2: File Structure Verification"

print_step "Checking file structure..."

if [ -f "./check.sh" ]; then
    chmod +x check.sh
    ./check.sh
    if [ $? -ne 0 ]; then
        print_error "File structure check failed"
        echo ""
        echo "Please ensure all files are in place before running this script."
        echo "Refer to the 'Artifact to File Mapping Guide' for details."
        exit 1
    fi
else
    print_error "check.sh not found"
    echo "Please create check.sh first"
    exit 1
fi

# ============================================================================
# STEP 3: Environment Configuration
# ============================================================================

print_header "STEP 3: Environment Configuration"

if [ ! -f "backend/.env" ]; then
    print_warning ".env file not found"
    echo ""
    
    if ask_yes_no "Would you like to create a default .env file?"; then
        print_step "Creating backend/.env..."
        
        # Generate random JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
        
        cat > backend/.env << EOF
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=aiplatform
DB_PASSWORD=aiplatform123
DB_NAME=aiplatform

# JWT Secret (randomly generated)
JWT_SECRET=${JWT_SECRET}
EOF
        print_success ".env file created"
        print_warning "IMPORTANT: Change DB_PASSWORD in production!"
    else
        print_error "Cannot proceed without .env file"
        exit 1
    fi
else
    print_success ".env file exists"
fi

# ============================================================================
# STEP 4: Docker Cleanup (Optional)
# ============================================================================

print_header "STEP 4: Clean Slate (Optional)"

if docker-compose ps 2>/dev/null | grep -q "Up"; then
    print_warning "Existing containers are running"
    echo ""
    if ask_yes_no "Would you like to stop and remove existing containers? (Recommended for fresh start)"; then
        print_step "Stopping containers..."
        docker-compose down
        
        if ask_yes_no "Also remove volumes? (This will DELETE ALL DATA)"; then
            print_step "Removing volumes..."
            docker-compose down -v
            print_success "Containers and volumes removed"
        else
            print_success "Containers stopped (volumes preserved)"
        fi
    fi
fi

# ============================================================================
# STEP 5: Build and Start Services
# ============================================================================

print_header "STEP 5: Build and Start Services"

print_step "Building and starting containers..."
echo ""

docker-compose up -d --build

if [ $? -ne 0 ]; then
    print_error "Failed to start containers"
    echo ""
    echo "Check logs with: docker-compose logs"
    exit 1
fi

print_success "Containers started"

# ============================================================================
# STEP 6: Wait for Services
# ============================================================================

print_header "STEP 6: Waiting for Services to Initialize"

print_step "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U aiplatform &> /dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

print_step "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost/api/health &> /dev/null; then
        print_success "Backend is ready"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# ============================================================================
# STEP 7: Database Initialization Check
# ============================================================================

print_header "STEP 7: Database Initialization"

print_step "Checking database initialization..."
echo ""

if [ -f "./check-db.sh" ]; then
    chmod +x check-db.sh
    ./check-db.sh
    
    if [ $? -ne 0 ]; then
        print_warning "Database not initialized"
        echo ""
        
        if ask_yes_no "Would you like to initialize the database manually?"; then
            if [ -f "./init-db-manual.sh" ]; then
                chmod +x init-db-manual.sh
                ./init-db-manual.sh
            else
                print_error "init-db-manual.sh not found"
            fi
        else
            print_warning "Skipping database initialization"
        fi
    fi
else
    print_warning "check-db.sh not found, skipping database verification"
fi

# ============================================================================
# STEP 8: Service Status
# ============================================================================

print_header "STEP 8: Service Status"

print_step "Checking container status..."
echo ""
docker-compose ps
echo ""

# ============================================================================
# STEP 9: API Test
# ============================================================================

print_header "STEP 9: API Health Check"

print_step "Testing API endpoint..."
echo ""

HEALTH_RESPONSE=$(curl -s http://localhost/api/health)

if [ $? -eq 0 ]; then
    print_success "API is responding"
    echo "Response: $HEALTH_RESPONSE"
else
    print_error "API is not responding"
    echo ""
    echo "Check backend logs with: docker-compose logs backend"
fi

# ============================================================================
# STEP 10: Next Steps
# ============================================================================

print_header "Deployment Complete!"

echo -e "${GREEN}✓ System is up and running!${NC}"
echo ""
echo -e "${CYAN}📋 Quick Commands:${NC}"
echo ""
echo "  View logs:"
echo "    docker-compose logs -f"
echo "    docker-compose logs -f backend"
echo "    docker-compose logs -f postgres"
echo ""
echo "  Stop services:"
echo "    docker-compose down"
echo ""
echo "  Restart services:"
echo "    docker-compose restart"
echo ""
echo "  Check database:"
echo "    ./check-db.sh"
echo ""
echo "  Database backup & restore:"
echo "    ./backup.sh              # Create backup"
echo "    ./list-backups.sh        # View all backups"
echo "    ./restore.sh             # Restore from backup"
echo "    ./rollback.sh            # Quick rollback to latest"
echo "    ./cleanup-backups.sh     # Clean old backups"
echo ""
echo "  Access database:"
echo "    docker-compose exec postgres psql -U aiplatform -d aiplatform"
echo ""
echo -e "${CYAN}🔑 Next Steps:${NC}"
echo ""
echo "  1. Add API keys for AI providers:"
echo "     - Register a user first"
echo "     - Use POST /api/providers/keys endpoint"
echo ""
echo "  2. Access services:"
echo "     - API: http://localhost/api"
echo "     - Traefik Dashboard: http://localhost:8080"
echo ""
echo "  3. Test the API:"
echo "     - Health: curl http://localhost/api/health"
echo "     - Register: curl -X POST http://localhost/api/auth/register \\"
echo "                      -H 'Content-Type: application/json' \\"
echo "                      -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
echo ""
echo -e "${CYAN}📚 Documentation:${NC}"
echo "  - Backend API Design"
echo "  - Database Initialization Guide"
echo "  - How to Add New AI Provider"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""