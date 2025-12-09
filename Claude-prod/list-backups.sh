#!/bin/bash

# List Backups Script
# Shows all available backups with detailed information

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

BACKUP_DIR="./backups"

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_header "Database Backups"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}No backup directory found${NC}"
    echo ""
    echo "Create a backup first with: ./backup.sh"
    exit 1
fi

# Count backups
REGULAR_COUNT=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | wc -l)
SAFETY_COUNT=$(ls -1 ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | wc -l)
TOTAL_COUNT=$((REGULAR_COUNT + SAFETY_COUNT))

if [ $TOTAL_COUNT -eq 0 ]; then
    echo -e "${YELLOW}No backups found${NC}"
    echo ""
    echo "Create a backup first with: ./backup.sh"
    exit 0
fi

echo "Total backups: $TOTAL_COUNT"
echo "  Regular backups: $REGULAR_COUNT"
echo "  Safety backups: $SAFETY_COUNT"
echo ""

# Calculate total size
if command -v bc &> /dev/null; then
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "Total size: $TOTAL_SIZE"
    echo ""
fi

# List regular backups
if [ $REGULAR_COUNT -gt 0 ]; then
    echo -e "${GREEN}━━━ Regular Backups ━━━${NC}"
    echo ""
    printf "%-35s %-10s %-20s\n" "FILENAME" "SIZE" "DATE"
    echo "────────────────────────────────────────────────────────────────────"
    
    ls -1t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | while read file; do
        filename=$(basename "$file")
        size=$(du -h "$file" | cut -f1)
        date=$(echo "$filename" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
        printf "%-35s %-10s %-20s\n" "$filename" "$size" "$date"
    done
    echo ""
fi

# List safety backups
if [ $SAFETY_COUNT -gt 0 ]; then
    echo -e "${YELLOW}━━━ Safety Backups (Pre-Restore) ━━━${NC}"
    echo ""
    printf "%-35s %-10s %-20s\n" "FILENAME" "SIZE" "DATE"
    echo "────────────────────────────────────────────────────────────────────"
    
    ls -1t ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | while read file; do
        filename=$(basename "$file")
        size=$(du -h "$file" | cut -f1)
        date=$(echo "$filename" | sed 's/pre_restore_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
        printf "%-35s %-10s %-20s\n" "$filename" "$size" "$date"
    done
    echo ""
fi

# Show commands
echo -e "${CYAN}Commands:${NC}"
echo ""
echo "  Create backup:      ./backup.sh"
echo "  Restore backup:     ./restore.sh [backup-file]"
echo "  Quick rollback:     ./rollback.sh"
echo "  Delete old backups: ./cleanup-backups.sh"
echo ""

# Show latest backup
LATEST=$(ls -1t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | head -n 1)
if [ -n "$LATEST" ]; then
    echo -e "${MAGENTA}Latest backup:${NC} $(basename $LATEST)"
    echo ""
fi