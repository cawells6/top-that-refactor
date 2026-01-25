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
MSG="$1"
if [ -z "$MSG" ]; then
  MSG="Update"
fi

echo "🚀 Starting ShipIt Sequence from branch: $CURRENT_BRANCH"

# 3. Save and Backup (using your gpush script)
# We accept exit code 0 or 1 here just in case gpush has a minor warning, 
# but generally we want it to succeed.
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

# 7. Go back to your work
echo "🔙 Returning to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

echo "✅ DONE! Fixes are live on Main."
