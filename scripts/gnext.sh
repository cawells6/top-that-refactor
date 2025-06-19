#!/bin/bash
# gnext.sh: Commit, push, create next branch (e.g., 4.1 -> 4.2), switch, and delete previous branch
# Usage: ./scripts/gnext.sh "Your commit message"

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Get commit message
MSG="$*"
if [ -z "$MSG" ]; then
  MSG="Update files"
  echo -e "${YELLOW}No commit message provided, using default: '$MSG'${NC}"
fi

echo -e "${GREEN}Staging, committing, and pushing...${NC}"
git add $(git ls-files --modified --others --exclude-standard | grep -v "^nul$")
git commit -m "$MSG" || echo -e "${YELLOW}No changes to commit.${NC}"
git push

# Get current branch (expecting format like 4.1)
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! $CUR_BRANCH =~ ^[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Current branch ($CUR_BRANCH) is not in expected format (e.g., 4.1)${NC}"
  exit 1
fi

# Calculate next branch (increment minor version)
MAJOR=$(echo $CUR_BRANCH | cut -d. -f1)
MINOR=$(echo $CUR_BRANCH | cut -d. -f2)
NEXT_MINOR=$((MINOR + 1))
NEXT_BRANCH="$MAJOR.$NEXT_MINOR"

echo -e "${GREEN}Creating and switching to next branch: $NEXT_BRANCH${NC}"
git checkout -b "$NEXT_BRANCH"
git push -u origin "$NEXT_BRANCH"

echo -e "${GREEN}Deleting previous branch: $CUR_BRANCH${NC}"
git push origin --delete "$CUR_BRANCH"
git branch -D "$CUR_BRANCH"
