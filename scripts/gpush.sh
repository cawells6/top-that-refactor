#!/bin/bash
# Simple script for git add, commit, and push in one step
# Usage: ./scripts/gpush.sh "Your commit message"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Get the commit message from all arguments
MSG="$*"

# If no commit message provided, use a default
if [ -z "$MSG" ]; then
  MSG="Update files"
  echo -e "${YELLOW}No commit message provided, using default: '$MSG'${NC}"
fi

echo -e "${GREEN}🚀 Starting git commit and push process...${NC}"

# Check and warn about problematic files like 'nul'
if [ -e "nul" ]; then
  echo -e "${RED}⚠️ WARNING: Found a 'nul' file which can cause git problems on Windows${NC}"
  echo -e "${YELLOW}Removing the problematic 'nul' file...${NC}"
  rm -f nul
fi

# Instead of git add ., add files individually to avoid problematic files
echo -e "${GREEN}🔄 Staging changes (skipping problematic files)...${NC}"
git add $(git ls-files --modified --others --exclude-standard | grep -v "^nul$")

# Commit with message
echo -e "${GREEN}🔄 Committing changes...${NC}"
git commit -m "$MSG"

# Check if commit was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Commit failed - perhaps no changes to commit?${NC}"
  exit 1
fi

# Push to remote
echo -e "${GREEN}🔄 Pushing to remote repository...${NC}"
git push

# Check if push was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Push failed - check network or try git pull first${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Changes successfully pushed!${NC}"
