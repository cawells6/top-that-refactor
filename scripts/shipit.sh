#!/bin/bash

# 🛑 SAFETY FIRST: Stop immediately if any command fails
set -euo pipefail

# 1. Prevention: Check if we are accidentally on main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" == "main" ]; then
  echo "⚠️  WHOA THERE! You are already on 'main'."
  echo "   You should only ship FROM a feature branch INTO main."
  echo "   Aborting."
  exit 1
fi

# 2. Get the commit message
# Use arguments if provided (e.g. ./shipit.sh "Fix login")
MSG="${*:-}"

# If NO argument was provided, ASK the user interactively
if [ -z "${MSG:-}" ]; then
  read -p "Enter Commit Message (Press Enter for 'Auto-save update'): " USER_INPUT
  MSG="${USER_INPUT:-Auto-save update}"
fi

echo "Commit message: $MSG"
echo "🚀 Starting ShipIt Sequence from branch: $CURRENT_BRANCH"

# 3. Save and Backup (using your gpush script)
if ! ./scripts/gpush.sh "$MSG"; then
  echo "ℹ️  Nothing to commit/push on $CURRENT_BRANCH. Continuing to merge anyway..."
fi

# 4. Switch to Main and Update
echo "🔄 Switching to Main..."
git checkout main
echo "📥 Pulling latest Main from GitHub..."
git pull --ff-only origin main

# 5. Merge the branch you started on
echo "🔀 Merging $CURRENT_BRANCH into Main..."
# Prefer a fast-forward merge (linear history). If it cannot fast-forward,
# fall back to a normal merge.
git merge --ff-only "$CURRENT_BRANCH" || git merge "$CURRENT_BRANCH"

# 6. Push Main to the world
echo "Mwuhahaha... Pushing to Live..."
git push origin main

echo "✅ DONE! Fixes are live on Main. You are now on Main."