#!/bin/bash

# Quick Rollback Script
# Automatically restores the most recent backup

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"

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

print_header "Quick Database Rollback"

# Check if backups exist
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null)" ]; then
    print_error "No backups found in $BACKUP_DIR"
    echo ""
    echo "Create a backup first with: ./backup.sh"
    exit 1
fi

# Find most recent backup (excluding pre_restore backups)
LATEST_BACKUP=$(ls -1t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    print_error "No regular backups found (only safety backups exist)"
    echo ""
    echo "Available safety backups:"
    ls -1t ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | while read file; do
        echo "  $(basename $file)"
    done
    echo ""
    echo "To restore a safety backup, use: ./restore.sh <backup-file>"
    exit 1
fi

# Show backup info
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
BACKUP_DATE=$(basename "$LATEST_BACKUP" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')

echo "Most recent backup:"
echo "  File: $(basename $LATEST_BACKUP)"
echo "  Size: $BACKUP_SIZE"
echo "  Date: $BACKUP_DATE"
echo ""

print_warning "⚠️  This will rollback to the above backup!"
echo ""
echo "Current database will be replaced with this backup."
echo "A safety backup will be created before rollback."
echo ""

if ! ask_yes_no "Continue with rollback?"; then
    echo "Rollback cancelled"
    exit 0
fi

echo ""
echo "Starting rollback process..."
echo ""

# Call restore script
./restore.sh "$LATEST_BACKUP"

if [ $? -eq 0 ]; then
    echo ""
    print_success "Rollback completed successfully!"
else
    echo ""
    print_error "Rollback failed!"
    exit 1
fi