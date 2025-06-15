#!/bin/bash
# Usage: ./next.sh
# This script will:
# 1. Commit and push all changes in the current branch
# 2. Merge the current branch into main and push main
# 3. Create the next iteration branch (e.g., 3.4, 3.5, ...), switch to it, and push it

set -e

# Get current branch name
git fetch
git pull
git status
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Extract the numeric part and increment
if [[ $current_branch =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  major=${BASH_REMATCH[1]}
  minor=${BASH_REMATCH[2]}
  next_minor=$((minor + 1))
  next_branch="$major.$next_minor"
else
  echo "Current branch is not in the format X.Y (e.g., 3.3). Aborting."
  exit 1
fi

echo "Committing and pushing changes on $current_branch..."
git add .
git commit -m "WIP: auto-commit before next iteration" || echo "No changes to commit."
git push

echo "Switching to main and merging $current_branch..."
git checkout main
git pull origin main
git merge $current_branch
git push origin main

echo "Creating and switching to $next_branch..."
git checkout -b $next_branch
git push --set-upstream origin $next_branch

echo "Done. Now on $next_branch."
