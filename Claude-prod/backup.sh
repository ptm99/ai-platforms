#!/bin/bash

# Database Backup Script
# Creates timestamped backups of the PostgreSQL database

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
DB_USER="aiplatform"
DB_NAME="aiplatform"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
KEEP_BACKUPS=10  # Number of backups to keep

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}➜${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header "Database Backup"

# Check if PostgreSQL container is running
print_step "Checking PostgreSQL container..."
if ! docker-compose ps postgres | grep -q "Up"; then
    print_error "PostgreSQL container is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi
print_success "PostgreSQL is running"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    print_step "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    print_success "Backup directory created"
fi

# Create backup
print_step "Creating backup..."
echo "  Target: $BACKUP_FILE"
echo ""

docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup created successfully"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $BACKUP_SIZE"
else
    print_error "Backup failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Compress backup
print_step "Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
print_success "Backup compressed"
echo "  File: $COMPRESSED_FILE"
echo "  Size: $COMPRESSED_SIZE"

# Clean old backups
print_step "Cleaning old backups..."
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$KEEP_BACKUPS" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - KEEP_BACKUPS))
    print_warning "Found $BACKUP_COUNT backups, removing oldest $REMOVE_COUNT"
    
    ls -1t ${BACKUP_DIR}/backup_*.sql.gz | tail -n "$REMOVE_COUNT" | while read file; do
        echo "  Removing: $(basename $file)"
        rm -f "$file"
    done
    
    print_success "Old backups cleaned"
else
    print_success "No old backups to clean (keeping last $KEEP_BACKUPS)"
fi

# List all backups
echo ""
print_step "Available backups:"
echo ""
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | awk '{printf "  %s %s  %s\n", $9, $5, $6" "$7" "$8}' | sed 's|./backups/||'

if [ $? -ne 0 ]; then
    echo "  No backups found"
fi

echo ""
print_success "Backup complete!"
echo ""
echo "To restore this backup, run:"
echo "  ./restore.sh $COMPRESSED_FILE"
echo ""