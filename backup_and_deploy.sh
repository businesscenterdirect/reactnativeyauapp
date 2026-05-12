#!/bin/bash
# ============================================================
# YAU Cloud Functions - Backup & Deploy Script
# ============================================================
set -e  # Stop immediately on any error

FUNCTIONS_DIR="/home/user/Documents/YAU-M+W/YAU-APP/YAU-Member-Panel/functions"
BACKUP_NAME="src_backup_$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$FUNCTIONS_DIR/$BACKUP_NAME"
DEPLOY_DIR="/home/user/Documents/YAU-M+W/YAU-APP/YAU-Member-Panel"

echo "======================================================"
echo "  STEP 1: Creating backup..."
echo "======================================================"
cp -r "$FUNCTIONS_DIR/src" "$BACKUP_PATH"

echo ""
echo "======================================================"
echo "  STEP 2: Verifying backup..."
echo "======================================================"

# Check backup directory exists
if [ -d "$BACKUP_PATH" ]; then
  echo "✅ Backup directory created: $BACKUP_PATH"
else
  echo "❌ BACKUP FAILED - directory not found. Aborting deployment."
  exit 1
fi

# Check key service files exist in backup
MEMBER_SVC="$BACKUP_PATH/services/memberService.js"
PARENT_SVC="$BACKUP_PATH/services/parentService.js"

if [ -f "$MEMBER_SVC" ]; then
  echo "✅ memberService.js backed up successfully"
else
  echo "❌ memberService.js NOT found in backup. Aborting."
  exit 1
fi

if [ -f "$PARENT_SVC" ]; then
  echo "✅ parentService.js backed up successfully"
else
  echo "❌ parentService.js NOT found in backup. Aborting."
  exit 1
fi

# Count backed up files
FILE_COUNT=$(find "$BACKUP_PATH" -type f | wc -l)
echo "✅ Total files in backup: $FILE_COUNT"

echo ""
echo "======================================================"
echo "  STEP 3: Deploying Cloud Functions to Firebase..."
echo "======================================================"
cd "$DEPLOY_DIR"
firebase deploy --only functions

echo ""
echo "======================================================"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "  Backup saved at: $BACKUP_PATH"
echo "======================================================"
