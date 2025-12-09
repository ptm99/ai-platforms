#!/bin/bash

# Database Restore Script
# Restores database from a backup file

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DB_USER="aiplatform"
DB_NAME="aiplatform"
BACKUP_DIR="./backups"

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

print_header "Database Restore"

# Check if PostgreSQL container is running
print_step "Checking PostgreSQL container..."
if ! docker-compose ps postgres | grep -q "Up"; then
    print_error "PostgreSQL container is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi
print_success "PostgreSQL is running"

# Determine backup file
BACKUP_FILE=""

if [ -z "$1" ]; then
    # No argument provided, list available backups
    print_step "Available backups:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null)" ]; then
        print_error "No backups found in $BACKUP_DIR"
        echo ""
        echo "Create a backup first with: ./backup.sh"
        exit 1
    fi
    
    # List backups with numbers
    i=1
    declare -a backups
    while IFS= read -r file; do
        backups[$i]="$file"
        size=$(du -h "$file" | cut -f1)
        date=$(basename "$file" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
        echo "  [$i] $(basename $file)"
        echo "      Size: $size, Date: $date"
        echo ""
        ((i++))
    done < <(ls -1t ${BACKUP_DIR}/backup_*.sql.gz)
    
    # Ask user to select
    echo ""
    read -p "Enter backup number to restore (or 'q' to quit): " selection
    
    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        echo "Restore cancelled"
        exit 0
    fi
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -ge "$i" ]; then
        print_error "Invalid selection"
        exit 1
    fi
    
    BACKUP_FILE="${backups[$selection]}"
else
    # Argument provided
    BACKUP_FILE="$1"
    
    # Check if file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

print_success "Selected backup: $(basename $BACKUP_FILE)"

# Show backup info
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(basename "$BACKUP_FILE" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
echo "  Size: $BACKUP_SIZE"
echo "  Date: $BACKUP_DATE"
echo ""

# Warning
print_warning "⚠️  WARNING: This will OVERWRITE the current database!"
echo ""
echo "Current database contents will be LOST."
echo "All users, projects, chats, and messages will be replaced with backup data."
echo ""

if ! ask_yes_no "Are you sure you want to continue?"; then
    echo "Restore cancelled"
    exit 0
fi

echo ""

# Create pre-restore backup
print_step "Creating safety backup of current database..."
SAFETY_BACKUP="${BACKUP_DIR}/pre_restore_$(date +"%Y%m%d_%H%M%S").sql.gz"
docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"

if [ $? -eq 0 ]; then
    print_success "Safety backup created: $SAFETY_BACKUP"
else
    print_error "Failed to create safety backup"
    if ! ask_yes_no "Continue anyway?"; then
        exit 1
    fi
fi

# Stop backend to prevent connection issues
print_step "Stopping backend service..."
docker-compose stop backend
print_success "Backend stopped"

# Decompress if needed
TEMP_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    print_step "Decompressing backup..."
    TEMP_FILE="/tmp/restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    print_success "Backup decompressed"
    RESTORE_SOURCE="$TEMP_FILE"
else
    RESTORE_SOURCE="$BACKUP_FILE"
fi

# Drop and recreate database
print_step "Dropping and recreating database..."
docker-compose exec -T postgres psql -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF

if [ $? -eq 0 ]; then
    print_success "Database recreated"
else
    print_error "Failed to recreate database"
    
    # Clean up
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    
    # Restart backend
    docker-compose start backend
    exit 1
fi

# Restore backup
print_step "Restoring backup..."
docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$RESTORE_SOURCE"

if [ $? -eq 0 ]; then
    print_success "Backup restored successfully"
else
    print_error "Restore failed"
    
    # Clean up
    [ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"
    
    # Try to restore from safety backup
    if [ -f "$SAFETY_BACKUP" ]; then
        print_warning "Attempting to restore from safety backup..."
        docker-compose exec -T postgres psql -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
        gunzip -c "$SAFETY_BACKUP" | docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"
        
        if [ $? -eq 0 ]; then
            print_success "Restored from safety backup"
        else
            print_error "Safety backup restore also failed!"
        fi
    fi
    
    docker-compose start backend
    exit 1
fi

# Clean up temp file
[ -n "$TEMP_FILE" ] && rm -f "$TEMP_FILE"

# Restart backend
print_step "Starting backend service..."
docker-compose start backend
sleep 3
print_success "Backend started"

# Verify restore
print_step "Verifying restore..."
USER_COUNT=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" | tr -d '[:space:]')
PROJECT_COUNT=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM projects;" | tr -d '[:space:]')
CHAT_COUNT=$(docker-compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM chat_sessions;" | tr -d '[:space:]')

echo ""
echo "Database statistics:"
echo "  Users: $USER_COUNT"
echo "  Projects: $PROJECT_COUNT"
echo "  Chat sessions: $CHAT_COUNT"
echo ""

print_success "Restore complete!"
echo ""
echo "The safety backup is kept at:"
echo "  $SAFETY_BACKUP"
echo ""
echo "You can delete it manually if everything is working correctly."
echo ""