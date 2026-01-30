#!/bin/bash

# 1. Ensure we are on 'main'
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "‚ö†Ô∏è  Safety Lock: This button only works from the 'main' branch."
  exit 1
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "Ì∫® Uncommitted changes detected!"
  echo "   1) Commit & Push (Save)"
  echo "   2) Stash (Save temporarily)"
  echo "   3) Discard (Delete)"
  echo "   4) Cancel"
  read -p "Ì±â Choose (1-4): " action

  case $action in
    1)
      git add .
      read -p "Commit Message: " msg
      git commit -m "${msg:-Auto-save before switch}"
      git push origin HEAD
      ;;
    2)
      git stash push -m "Stashed via Switch Button"
      ;;
    3)
      git reset --hard
      ;;
    *)
      echo "‚ùå Cancelled."
      exit 1
      ;;
  esac
fi

# 3. Fetch and Select Branch
echo "‚òÅÔ∏è  Fetching latest..."
git fetch --all --prune
echo ""
echo "Ìºø Latest Remote Branches:"
git branch -r --sort=-committerdate | grep -v 'HEAD' | sed 's/origin\///' | head -n 10 | awk '{print NR ") " $0}'
echo ""
read -p "Ì±â Type branch name to join: " target_branch

if [ -z "$target_branch" ]; then
  echo "‚ùå No branch specified."
  exit 1
fi

git checkout "$target_branch"
git pull origin "$target_branch"
