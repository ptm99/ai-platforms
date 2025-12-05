#!/bin/bash

# Cleanup Backups Script
# Removes old backups based on retention policy

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BACKUP_DIR="./backups"
DEFAULT_KEEP=10

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

print_header "Backup Cleanup"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A ${BACKUP_DIR}/*.sql.gz 2>/dev/null)" ]; then
    print_error "No backups found"
    exit 0
fi

# Count backups
REGULAR_COUNT=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | wc -l)
SAFETY_COUNT=$(ls -1 ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | wc -l)

echo "Current backup counts:"
echo "  Regular backups: $REGULAR_COUNT"
echo "  Safety backups: $SAFETY_COUNT"
echo ""

# Ask for retention policy
echo "How many regular backups would you like to keep?"
read -p "Keep last N backups [default: $DEFAULT_KEEP]: " KEEP_COUNT

if [ -z "$KEEP_COUNT" ]; then
    KEEP_COUNT=$DEFAULT_KEEP
fi

if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]]; then
    print_error "Invalid number"
    exit 1
fi

echo ""

# Clean regular backups
if [ $REGULAR_COUNT -gt $KEEP_COUNT ]; then
    REMOVE_REGULAR=$((REGULAR_COUNT - KEEP_COUNT))
    print_warning "Will remove $REMOVE_REGULAR old regular backup(s)"
    echo ""
    
    echo "Files to be deleted:"
    ls -1t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | tail -n $REMOVE_REGULAR | while read file; do
        size=$(du -h "$file" | cut -f1)
        echo "  $(basename $file) ($size)"
    done
    echo ""
    
    if ask_yes_no "Delete these backups?"; then
        ls -1t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | tail -n $REMOVE_REGULAR | while read file; do
            rm -f "$file"
        done
        print_success "Regular backups cleaned"
    else
        echo "Skipped regular backup cleanup"
    fi
else
    print_success "Regular backups within limit (keeping $KEEP_COUNT, have $REGULAR_COUNT)"
fi

echo ""

# Clean safety backups
if [ $SAFETY_COUNT -gt 0 ]; then
    print_warning "Found $SAFETY_COUNT safety backup(s) (pre-restore backups)"
    echo ""
    
    echo "Safety backups are created before each restore operation."
    echo "They can be safely deleted once you're sure the restore was successful."
    echo ""
    
    if ask_yes_no "Delete all safety backups?"; then
        FREED_SPACE=$(du -sh ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | tail -n 1 | cut -f1)
        rm -f ${BACKUP_DIR}/pre_restore_*.sql.gz
        print_success "Safety backups deleted (freed ~$FREED_SPACE)"
    else
        echo "Kept safety backups"
    fi
fi

echo ""

# Show final status
REMAINING_REGULAR=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | grep -v "pre_restore" | wc -l)
REMAINING_SAFETY=$(ls -1 ${BACKUP_DIR}/pre_restore_*.sql.gz 2>/dev/null | wc -l)

print_success "Cleanup complete"
echo ""
echo "Remaining backups:"
echo "  Regular: $REMAINING_REGULAR"
echo "  Safety: $REMAINING_SAFETY"
echo ""

if [ $REMAINING_REGULAR -eq 0 ] && [ $REMAINING_SAFETY -eq 0 ]; then
    print_warning "No backups remaining!"
    echo "Create a new backup with: ./backup.sh"
fi