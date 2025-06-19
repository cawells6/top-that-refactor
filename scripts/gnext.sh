#!/bin/bash
# gnext.sh: Commit, push, create new branch (from arg), switch, and delete previous branch
# Usage: ./scripts/gnext.sh "Your commit message" new-branch-name

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Get commit message and branch name
MSG="$1"
NEXT_BRANCH="$2"

if [ -z "$MSG" ]; then
  MSG="Update files"
  echo -e "${YELLOW}No commit message provided, using default: '$MSG'${NC}"
fi
if [ -z "$NEXT_BRANCH" ]; then
  echo -e "${RED}No branch name provided. Aborting.${NC}"
  exit 1
fi

echo -e "${GREEN}Staging, committing, and pushing...${NC}"
git add $(git ls-files --modified --others --exclude-standard | grep -v "^nul$")
git commit -m "$MSG" || echo -e "${YELLOW}No changes to commit.${NC}"
git push

# Get current branch
CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${GREEN}Current branch: $CUR_BRANCH${NC}"

echo -e "${GREEN}Creating and switching to new branch: $NEXT_BRANCH${NC}"
git checkout -b "$NEXT_BRANCH"
git push -u origin "$NEXT_BRANCH"

echo -e "${GREEN}Deleting previous branch: $CUR_BRANCH${NC}"
git push origin --delete "$CUR_BRANCH"
git branch -D "$CUR_BRANCH"
